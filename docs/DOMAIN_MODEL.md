# CircuitMind — Domain Model Specification

## 1. Entity Relationships

```mermaid
classDiagram
    class Project {
        +UUID id
        +string name
        +string description
        +int revision
        +Requirements requirements
        +Architecture architecture
        +string target_board
        +datetime created_at
        +datetime updated_at
    }

    class ComponentInstance {
        +string instance_id
        +string catalog_id
        +string name
        +string role
        +Position position
        +dict properties
    }

    class Pin {
        +string pin_id
        +string name
        +PinRole role
        +PinDirection direction
        +float voltage_min
        +float voltage_max
        +list~string~ capabilities
    }

    class Net {
        +string net_id
        +string name
        +NetType net_type
        +list~PinReference~ pins
        +string rationale
    }

    class ValidationFinding {
        +string rule_id
        +Severity severity
        +string message
        +string explanation
        +string remedy
        +list~string~ affected_instances
        +list~string~ affected_pins
        +list~string~ affected_nets
    }

    class FirmwareArtifact {
        +int revision
        +string language
        +string target_platform
        +string source_code
        +dict pin_map
        +bool compiled
        +string compilation_status
    }

    class SimulationArtifact {
        +int revision
        +string scenario_name
        +bool passed
        +list~SimulationStep~ trace
        +string execution_timestamp
    }

    Project "1" *-- "*" ComponentInstance : contains
    ComponentInstance "1" *-- "*" Pin : defines
    Project "1" *-- "*" Net : connects
    Project "1" *-- "*" ValidationFinding : validates
    Project "1" *-- "0..1" FirmwareArtifact : generates
    Project "1" *-- "*" SimulationArtifact : verifies
```

## 2. Invariants and Constraints

- **PinReference**: Identified by `(instance_id, pin_id)`.
- **Net Membership**: A pin cannot belong to more than one distinct net. If two nets share a pin, they must be merged or flagged as a short-circuit conflict.
- **Power and Ground Integrity**: Every active electronic component instance requiring power must have its VCC/VDD pin connected to a compatible power net (e.g. 3.3V or 5V) and its GND pin connected to a shared ground net.
- **Strapping Pin Restrictions**: For ESP32, strapping pins (GPIO0, GPIO2, GPIO12, GPIO15) must not be assigned to components that force levels during reset (e.g. buttons pulling to GND without series resistors, or pull-downs on GPIO12).
- **Level Shifting / Divider Protection**: Inputs rated at 3.3V maximum (such as ESP32 GPIOs) connected to 5V signal outputs (such as HC-SR04 ECHO) require level shifting or a voltage divider network (e.g., 1kΩ / 2kΩ).
- **Current Limiting**: Standard LEDs require current-limiting resistors connected in series to prevent overcurrent damage to both the LED and microcontroller pins.
