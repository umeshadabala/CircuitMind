from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from backend.app.models.project import Project, TestResult, DiagnosticIssue
from backend.app.models.memory import MemoryEvent
from backend.app.database.db import insert_memory_event

class DebugDiagnosis(BaseModel):
    title: str
    defect_type: str
    root_cause: str
    evidence: List[str]
    affected_entities: List[str]
    proposed_patch: Dict[str, Any]
    patch_diff: str
    remediation_explanation: str

def inject_demo_defect(project: Project, defect_type: str = "misassigned_buzzer_pin") -> Project:
    """
    Injects a reproducible hardware/firmware defect for the demonstration scenario.
    """
    updated_project = project.model_copy(deep=True)
    
    if defect_type == "misassigned_buzzer_pin":
        # Disconnect buzzer from GPIO19 and assign to unrouted GPIO4 or wrong pin
        for pa in updated_project.pin_assignments:
            if ("buzzer" in pa.component_id.lower()) and pa.component_pin in ["2", "SIG"]:
                pa.board_pin = "D4"  # Changed to uninitialized pin D4
                
        for conn in updated_project.connections:
            if ("buzzer" in conn.from_component.lower()) and conn.from_pin in ["2", "SIG"]:
                conn.to_pin = "D4"
            elif ("buzzer" in conn.to_component.lower()) and conn.to_pin in ["2", "SIG"]:
                conn.from_pin = "D4"
                
    elif defect_type == "inverted_threshold":
        # Invert condition in requirements or description
        for req in updated_project.requirements:
            if "20" in req.description:
                req.description = req.description.replace("closer than 20 cm", "farther than 20 cm")
                
    elif defect_type == "disconnected_gnd":
        # Remove ground connection for warning LED
        updated_project.connections = [
            c for c in updated_project.connections 
            if not (("warning_led" in c.from_component or "warning_led" in c.to_component) and ("C" in c.from_pin or "C" in c.to_pin))
        ]

    return updated_project

def analyze_and_diagnose(project: Project, test_results: List[TestResult], validation_issues: List[DiagnosticIssue]) -> Optional[DebugDiagnosis]:
    """
    Performs evidence-based diagnosis on validation diagnostics or test failure results.
    """
    # 1. Check for validation diagnostics
    for issue in validation_issues:
        if issue.code == "PIN_CONFLICT":
            return DebugDiagnosis(
                title="GPIO Pin Conflict Detected",
                defect_type="hardware_pin_conflict",
                root_cause=f"Multiple components routed to the same physical GPIO: {issue.message}",
                evidence=[issue.message],
                affected_entities=issue.affected_entities,
                proposed_patch={"action": "reassign_pin", "pin": "D26"},
                patch_diff="- Pin D23 shared by multiple components\n+ Reassigned component to unused Pin D26",
                remediation_explanation="Reassign one of the conflicting components to an available GPIO pin."
            )
        elif issue.code == "UNCONNECTED_REQUIRED_PIN":
            return DebugDiagnosis(
                title=f"Missing Essential Wiring: {issue.affected_entities}",
                defect_type="unconnected_pin",
                root_cause=issue.message,
                evidence=[issue.message],
                affected_entities=issue.affected_entities,
                proposed_patch={"action": "add_connection"},
                patch_diff=f"+ Wire {issue.affected_entities} to ground/power rail",
                remediation_explanation=issue.remediation or "Connect required pins to appropriate rails."
            )

    # 2. Check for test failures
    failed_tests = [tr for tr in test_results if tr.status == "failed"]
    if not failed_tests:
        return None
        
    failed = failed_tests[0]
    evidence_list = [
        f"Test: {failed.test_name}",
        f"Expected: {failed.expected}",
        f"Observed: {failed.observed}",
        f"Evidence Data: {failed.evidence}"
    ]
    
    # Check if buzzer is misassigned or wrong pin
    buzzer_pa = next((pa for pa in project.pin_assignments if "buzzer" in pa.component_id.lower() and pa.component_pin in ["2", "SIG"]), None)
    buzzer_pin = buzzer_pa.board_pin if buzzer_pa else ""
    actual_buzzer_id = buzzer_pa.component_id if buzzer_pa else "buzzer"
    
    if buzzer_pin != "D19" and "buzzer" in failed.observed.lower():
        diff_text = f"""--- a/hardware_config
+++ b/hardware_config
@@ -12,3 +12,3 @@
- {actual_buzzer_id}:2 -> board:{buzzer_pin}
+ {actual_buzzer_id}:2 -> board:D19 (Active Piezo PWM Pin)"""

        return DebugDiagnosis(
            title="Acoustic Actuator Pin Misrouting",
            defect_type="pin_misassignment",
            root_cause=f"The piezo buzzer is assigned to {buzzer_pin}, but the firmware and intended routing expect PWM-capable GPIO19 (D19).",
            evidence=evidence_list,
            affected_entities=["buzzer", actual_buzzer_id, "connections", "pin_assignments"],
            proposed_patch={
                "component_id": actual_buzzer_id,
                "component_pin": buzzer_pa.component_pin if buzzer_pa else "2",
                "corrected_board_pin": "D19"
            },
            patch_diff=diff_text,
            remediation_explanation=f"Re-route Buzzer terminal {buzzer_pa.component_pin if buzzer_pa else '2'} to board pin D19 (GPIO19) and update firmware #define BUZZER_PIN."
        )

    # Generic test failure diagnosis
    return DebugDiagnosis(
        title="Behavioral Threshold Divergence",
        defect_type="threshold_mismatch",
        root_cause=f"Simulated physical behavior diverged from specification. {failed.diagnostic or ''}",
        evidence=evidence_list,
        affected_entities=["firmware", "tests"],
        proposed_patch={"action": "recalibrate_threshold"},
        patch_diff="- Threshold condition diverged\n+ Aligned condition with specification",
        remediation_explanation="Recalibrate firmware comparison operator and threshold constant."
    )

def apply_repair_patch(project: Project, diagnosis: DebugDiagnosis) -> Project:
    """
    Applies the verified patch to the project model.
    """
    repaired = project.model_copy(deep=True)
    patch = diagnosis.proposed_patch
    
    if diagnosis.defect_type == "pin_misassignment":
        target_comp = patch.get("component_id", "buzzer")
        target_pin = patch.get("component_pin", "2")
        corrected_pin = patch.get("corrected_board_pin", "D19")
        
        # Update pin assignments
        for pa in repaired.pin_assignments:
            if (pa.component_id == target_comp or "buzzer" in pa.component_id.lower()) and pa.component_pin == target_pin:
                pa.board_pin = corrected_pin
                
        # Update connections
        for conn in repaired.connections:
            if (conn.from_component == target_comp or "buzzer" in conn.from_component.lower()) and conn.from_pin == target_pin:
                conn.to_pin = corrected_pin
            elif (conn.to_component == target_comp or "buzzer" in conn.to_component.lower()) and conn.to_pin == target_pin:
                conn.from_pin = corrected_pin
                
    repaired.version += 1
    return repaired
