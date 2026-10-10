import { Project, ComponentInstance } from '../types';

/**
 * Standard Electronics Reference Designator Prefixes
 */
const DESIGNATOR_PREFIX_MAP: Record<string, string> = {
  pushbutton: 'SW',
  switch: 'SW',
  'led-red': 'D',
  'led-green': 'D',
  'led-blue': 'D',
  led: 'D',
  'resistor-220': 'R',
  resistor: 'R',
  'buzzer-piezo': 'BZ',
  buzzer: 'BZ',
  potentiometer: 'RV',
  servo: 'M',
  motor: 'M',
  'esc-interface': 'ESC',
  esc: 'ESC',
  dht22: 'S',
  dht11: 'S',
  'hc-sr04': 'S',
  'soil-moisture': 'S',
  mpu6050: 'U',
  'oled-ssd1306': 'DISP',
  lcd: 'DISP'
};

/**
 * Clean canonical display names for known catalog parts
 */
const CATALOG_DISPLAY_NAMES: Record<string, string> = {
  pushbutton: 'Tactile Push Button',
  'led-red': 'Red LED',
  'led-green': 'Green LED',
  'led-blue': 'Blue LED',
  'resistor-220': '220 Ω Resistor',
  'buzzer-piezo': 'Piezo Buzzer',
  mpu6050: 'MPU-6050 6-DoF IMU',
  'esc-interface': 'Electronic Speed Controller (ESC)',
  dht22: 'DHT22 Temp & Humidity Sensor',
  dht11: 'DHT11 Temp & Humidity Sensor',
  'hc-sr04': 'HC-SR04 Ultrasonic Sensor',
  servo: 'SG90 Micro Servo',
  'oled-ssd1306': 'SSD1306 OLED Display',
  potentiometer: '10kΩ Potentiometer',
  'soil-moisture': 'Soil Moisture Sensor'
};

/**
 * Computes a readable, stable engineering designator (e.g. SW1, D1, R1, BZ1, S1)
 * based on component part category and instance index.
 */
export function getComponentDesignator(component: ComponentInstance, allComponents: ComponentInstance[] = []): string {
  const partId = (component.part_id || '').toLowerCase();
  
  // Find prefix
  let prefix = 'U';
  for (const [key, val] of Object.entries(DESIGNATOR_PREFIX_MAP)) {
    if (partId === key || partId.includes(key)) {
      prefix = val;
      break;
    }
  }

  // Count position among components sharing the same prefix
  const samePrefixComps = allComponents.filter((c) => {
    const cPart = (c.part_id || '').toLowerCase();
    for (const [key, val] of Object.entries(DESIGNATOR_PREFIX_MAP)) {
      if (cPart === key || cPart.includes(key)) {
        return val === prefix;
      }
    }
    return prefix === 'U';
  });

  const idx = samePrefixComps.findIndex((c) => c.id === component.id);
  const number = idx >= 0 ? idx + 1 : 1;
  return `${prefix}${number}`;
}

/**
 * Returns a human-friendly base name (e.g. "Tactile Push Button", "Red LED", "220 Ω Resistor").
 * Separates internal IDs (like "proj-b727a0cf-pushbutton") from display names.
 */
export function getComponentReadableName(compId: string, project?: Project | null): string {
  if (!compId) return 'Unknown Node';
  if (compId === 'board') {
    return project?.board?.display_name || 'Microcontroller Board';
  }

  const comp = project?.components?.find((c) => c.id === compId);
  if (comp) {
    const partId = (comp.part_id || '').toLowerCase();
    if (CATALOG_DISPLAY_NAMES[partId]) {
      return CATALOG_DISPLAY_NAMES[partId];
    }
    // If comp.name is clean and not a UUID/internal string
    if (comp.name && !comp.name.includes('proj-') && !comp.name.match(/[0-9a-f]{8}/i)) {
      return comp.name;
    }
  }

  // Fallback: format gracefully from ID if metadata missing
  const clean = compId
    .replace(/^proj-[a-f0-9]+-?/i, '')
    .replace(/[-_]/g, ' ')
    .trim();

  if (!clean) return compId;
  return clean
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/**
 * Returns a complete user-facing component display label,
 * optionally including its readable designator, e.g. "Tactile Push Button (SW1)"
 * or "ESP32 DevKit V1 (Board)".
 */
export function getComponentDisplayLabel(
  compId: string,
  project?: Project | null,
  includeDesignator: boolean = true
): string {
  if (!compId) return 'Unknown Node';
  if (compId === 'board') {
    const boardName = project?.board?.display_name || 'Microcontroller';
    return `${boardName} (Board)`;
  }

  const baseName = getComponentReadableName(compId, project);
  const comp = project?.components?.find((c) => c.id === compId);

  if (comp && includeDesignator) {
    const designator = getComponentDesignator(comp, project?.components || []);
    return `${baseName} (${designator})`;
  }

  return baseName;
}

/**
 * Formats a terminal/pin connection label for netlist or inspector:
 * e.g. "Tactile Push Button (SW1) : 1.l" or "ESP32 DevKit V1 (Board) : D23"
 */
export function formatTerminalLabel(compId: string, pin: string, project?: Project | null): string {
  const compLabel = getComponentDisplayLabel(compId, project, true);
  return `${compLabel} : ${pin}`;
}
