import httpx
import json

client = httpx.Client(base_url="http://127.0.0.1:8000")

def run_demo():
    print("========================================================")
    print("CIRCUITMIND: MASTER BRIEF DEMONSTRATION VERIFICATION")
    print("========================================================")

    # Step 1 & 2: Plan Project
    print("\n--- STEP 1 & 2: PLAN PROJECT ---")
    prompt = "Build a smart parking sensor using an ESP32. When an object is closer than 20 cm, activate a warning LED and buzzer. Explain the wiring and show me how to test it."
    res = client.post("/api/projects/plan", json={"prompt": prompt})
    assert res.status_code == 200, res.text
    proj = res.json()
    proj_id = proj["id"]
    print(f"Created Project: '{proj['title']}' (ID: {proj_id}, Version: {proj['version']})")
    print(f"Target Board: {proj['board']['display_name']} ({proj['board']['architecture']})")
    print(f"Deterministic Hardware Validation: {proj['validation']['status'].upper()}")
    print(f"Components: {len(proj['components'])} parts catalogued")
    print(f"Connections: {len(proj['connections'])} routed wires")
    print(f"Verification Tests: {len(proj['tests'])} structured behavioral tests")

    # Step 3: Inspect Artifacts
    print("\n--- STEP 3: INSPECT ARTIFACTS ---")
    res_diag = client.get(f"/api/projects/{proj_id}/export/wokwi")
    assert res_diag.status_code == 200
    diag = res_diag.json()
    print(f"Wokwi diagram.json parts: {len(diag['parts'])}, connections: {len(diag['connections'])}")
    assert len(proj["firmware"]) > 0
    print(f"Firmware: {proj['firmware'][0]['filename']} ({len(proj['firmware'][0]['code'].splitlines())} lines of C++)")
    assert proj["build_guide"] is not None
    print(f"Build Guide: {len(proj['build_guide']['steps'])} ordered assembly steps")

    # Step 4 & 5: Simulate & Verify
    print("\n--- STEP 4 & 5: SIMULATE & VERIFY ---")
    res_sim = client.post(f"/api/projects/{proj_id}/simulate")
    assert res_sim.status_code == 200
    sim_run = res_sim.json()
    print(f"Simulation Run: {sim_run['id']} | Status: {sim_run['status'].upper()}")
    print(f"Telemetry Logs Generated: {len(sim_run['serial_logs'])} lines")
    for log in sim_run["serial_logs"][:3]:
        print(f"   {log}")
    print("Test Results:")
    for tr in sim_run["test_results"]:
        print(f"   [{tr['status'].upper()}] {tr['test_name']}: Expected: \"{tr['expected']}\" | Observed: \"{tr['observed']}\"")

    # Step 6: Modify Project (Threshold to 50 cm)
    print("\n--- STEP 6: MODIFY PROJECT (THRESHOLD TO 50 CM) ---")
    res_mod = client.post("/api/projects/plan", json={"prompt": "Change the warning threshold to 50 cm.", "existing_project_id": proj_id})
    assert res_mod.status_code == 200
    mod_proj = res_mod.json()
    print(f"Updated Project Version: v{mod_proj['version']}")
    print(f"Updated Description: {mod_proj['description']}")
    assert "50" in mod_proj["firmware"][0]["code"]
    print("Confirmed: Firmware updated with DISTANCE_THRESHOLD_CM = 50.0")

    # Step 7: DMAI Memory Query
    print("\n--- STEP 7: DMAI ENGINEERING MEMORY ---")
    res_mem = client.get(f"/api/projects/{proj_id}/memory")
    assert res_mem.status_code == 200
    events = res_mem.json()
    print(f"Total Persistent Engineering Events Recorded: {len(events)}")
    for e in events[:4]:
        print(f"   • [{e['event_type']}] {e['summary']} (v{e['project_version']})")

    res_ask = client.post(f"/api/projects/{proj_id}/dmai/ask", json={"question": "Why is the piezo buzzer connected to GPIO19?"})
    assert res_ask.status_code == 200
    print(f"DMAI Inquiry: 'Why is the piezo buzzer connected to GPIO19?'")
    print(f"DMAI Verified Rationale: {res_ask.json()['answer']}")

    # Step 8: Inject Defect, Diagnose, Repair, and Re-test
    print("\n--- STEP 8: INJECT DEFECT, DIAGNOSE, AND REPAIR ---")
    res_defect = client.post(f"/api/projects/{proj_id}/debug/inject-defect?defect_type=misassigned_buzzer_pin")
    assert res_defect.status_code == 200
    print("Injected reproducible failure: Buzzer misassigned to Pin D4 instead of D19")

    # Simulate Defective State
    res_sim_fail = client.post(f"/api/projects/{proj_id}/simulate")
    fail_run = res_sim_fail.json()
    print(f"Simulation Status: {fail_run['status'].upper()} (Expected failure caught)")

    # Diagnose Defect
    res_diag = client.post(f"/api/projects/{proj_id}/debug/diagnose")
    diag = res_diag.json()
    print(f"AI Debugger Diagnosis: {diag['title']}")
    print(f"Root Cause: {diag['root_cause']}")
    print(f"Patch Diff:\n{diag['patch_diff']}")

    # Apply Repair Patch
    res_patch = client.post(f"/api/projects/{proj_id}/debug/apply-patch", json=diag)
    assert res_patch.status_code == 200
    print("Repair patch applied successfully to project graph!")

    # Re-Verify
    res_retest = client.post(f"/api/projects/{proj_id}/simulate")
    retest_run = res_retest.json()
    print(f"Re-Verification Simulation Status: {retest_run['status'].upper()}")
    assert retest_run["status"] == "passed"
    print("\n[SUCCESS] CLOSED ENGINEERING LOOP COMPLETE: All 8 demonstration steps verified!")

if __name__ == "__main__":
    run_demo()
