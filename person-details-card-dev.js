class PersonDetailsCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' }); 
    this._renderedCard = false;
    this._pressTimer = null;
  }

  setConfig(config) {
    if (!config.entity) {
      throw new Error("Bitte gib eine Entität (Person) an!");
    }
    this.config = config;
  }

  static getCardSize() {
    return 6;
  }

  getGridOptions() {
    return {
      columns: 6,
      min_columns: 3,
      max_columns: 12
    };
  }

  static getConfigElement() {
    return document.createElement('person-details-card-dev-editor');
  }

  static getStubConfig() {
    return { entity: "person.rudolf" };
  }

  set hass(hass) {
    this._hass = hass;
    const personId = this.config.entity;
    const personDaten = hass.states[personId];

    if (!personDaten) {
      this.shadowRoot.innerHTML = `<ha-card><div style="padding: 20px; color: white;">Person nicht gefunden!</div></ha-card>`;
      return;
    }

    const status = personDaten.state;
    const bildUrl = personDaten.attributes.entity_picture;

    const vars = this.config.variables || {};
    
    // 1. Batterie-Logik
    let batteryLvl = "–";
    let batteryColor = "#77c66e"; 
    let batteryIcon = "mdi:battery";
    
    if (vars.battery_level && hass.states[vars.battery_level]) {
      batteryLvl = hass.states[vars.battery_level].state;
      const numLvl = parseFloat(batteryLvl);
      if (!isNaN(numLvl)) {
        if (numLvl < 10) {
          batteryColor = "#ef4f1a"; 
        } else if (numLvl < 30) {
          batteryColor = "#ffa500"; 
        }

        if (numLvl >= 95) batteryIcon = "mdi:battery";
        else if (numLvl <= 5) batteryIcon = "mdi:battery-outline";
        else {
          const rounded = Math.floor(numLvl / 10) * 10;
          batteryIcon = `mdi:battery-${rounded}`;
        }
      }
    }

    if (vars.battery_state && hass.states[vars.battery_state]) {
      const bState = hass.states[vars.battery_state].state;
      if (bState === 'charging' || bState === 'True' || bState === 'on') {
        batteryIcon = "mdi:battery-charging";
      }
    }

    // 2. WLAN-Logik
    let wifiText = "–";
    let wifiIcon = "mdi:wifi-off";
    let wifiColor = "#ef4f1a"; 
    if (vars.wifi && hass.states[vars.wifi]) {
      const ssid = hass.states[vars.wifi].state;
      if (ssid && ssid !== "unknown" && ssid !== "unavailable" && ssid !== "None" && ssid !== "" && ssid !== "Off" && ssid !== "<not connected>" && !ssid.toLowerCase().includes("not connected")) {
        wifiText = ssid;
        wifiIcon = "mdi:wifi";
        wifiColor = "#77c66e"; 
      } else {
        wifiText = "Offline";
        wifiIcon = "mdi:wifi-off";
        wifiColor = "#ef4f1a";
      }
    }

    // 3. Proximity
    let proximityText = "–";
    if (vars.proximity && hass.states[vars.proximity]) {
      const rawVal = hass.states[vars.proximity].state;
      const d = parseFloat(rawVal);
      proximityText = isNaN(d) ? rawVal : (d / 1000).toFixed(1) + " km";
    }

    // Dynamische Rahmenfarbe anhand der Konfiguration
    let rahmenFarbe = "#dedede";
    const locationColors = this.config.location_colors || [];
    const matchedLocation = locationColors.find(item => item.zone === status);
    if (matchedLocation && matchedLocation.color) {
      rahmenFarbe = matchedLocation.color;
    } else if (status === "home") {
      rahmenFarbe = "#77c66e";
    }

    const icons = {
      home: "mdi:home",
      not_home: "mdi:home-export-outline"
    };
    const statusIcon = icons[status] || "mdi:map-marker-radius";

    if (!this._renderedCard) {
      this.shadowRoot.innerHTML = `
        <style>
          ha-card {
            padding: 15px;
            display: grid;
            grid-template-columns: 2fr 3fr;
            grid-template-areas: "icon details";
            gap: 25px;
            align-items: center;
            color: white;
            font-family: inherit;
          }

          .profilbild {
            grid-area: icon;
            width: 100%;
            aspect-ratio: 1/1;
            border-radius: 10px;
            border: 5px solid #dedede;
            object-fit: cover;
            box-sizing: border-box;
            cursor: pointer;
            transition: transform 0.1s ease;
          }

          .profilbild:active {
            transform: scale(0.96);
          }

          .details {
            grid-area: details;
            display: flex;
            flex-direction: column;
            justify-content: center;
            gap: 10px;
            font-size: 11px;
          }

          .zeile {
            display: flex;
            align-items: center;
            gap: 15px;
          }

          ha-icon {
            width: 16px;
            height: 16px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
          }

          .text-white {
            color: white !important;
          }
        </style>

        <ha-card>
          <img class="profilbild" alt="Profilbild">
          
          <div class="details">
            <div class="zeile">
              <ha-icon id="status-icon" style="color: white;"></ha-icon>
              <span id="status-text" class="text-white" style="text-transform: capitalize; font-weight: bold;"></span>
            </div>
            <div class="zeile">
              <ha-icon id="battery-icon"></ha-icon>
              <span id="battery-text" class="text-white"></span>
            </div>
            <div class="zeile">
              <ha-icon id="wifi-icon"></ha-icon>
              <span id="wifi-text" class="text-white"></span>
            </div>
            <div class="zeile">
              <ha-icon icon="mdi:map-marker-distance" style="color: white;"></ha-icon>
              <span id="proximity-text" class="text-white"></span>
            </div>
          </div>
        </ha-card>
      `;

      this._renderedCard = true;
      this._attachPhotoListeners();
    }

    const imgEl = this.shadowRoot.querySelector('.profilbild');
    if (bildUrl) imgEl.src = bildUrl;
    imgEl.style.borderColor = rahmenFarbe;

    const statusIconEl = this.shadowRoot.getElementById('status-icon');
    statusIconEl.setAttribute('icon', statusIcon);

    const statusTextEl = this.shadowRoot.getElementById('status-text');
    statusTextEl.textContent = status;

    const batteryIconEl = this.shadowRoot.getElementById('battery-icon');
    batteryIconEl.setAttribute('icon', batteryIcon);
    batteryIconEl.style.color = batteryColor;

    const batteryTextEl = this.shadowRoot.getElementById('battery-text');
    batteryTextEl.textContent = `${batteryLvl}% battery`;

    const wifiIconEl = this.shadowRoot.getElementById('wifi-icon');
    wifiIconEl.setAttribute('icon', wifiIcon);
    wifiIconEl.style.color = wifiColor;

    const wifiTextEl = this.shadowRoot.getElementById('wifi-text');
    wifiTextEl.textContent = wifiText;

    const proximityTextEl = this.shadowRoot.getElementById('proximity-text');
    proximityTextEl.textContent = proximityText;
  }

  _attachPhotoListeners() {
    const imgEl = this.shadowRoot.querySelector('.profilbild');
    if (!imgEl) return;

    const clearTimer = () => {
      if (this._pressTimer) {
        clearTimeout(this._pressTimer);
        this._pressTimer = null;
      }
    };

    imgEl.addEventListener('pointerdown', (e) => {
      clearTimer();
      this._pressTimer = setTimeout(() => {
        this._pressTimer = null;
        this._executeAction('hold_action');
      }, 600); // 600ms Gedrückt halten
    });

    imgEl.addEventListener('pointerup', (e) => {
      if (this._pressTimer) {
        clearTimer();
        this._executeAction('tap_action');
      }
    });

    imgEl.addEventListener('pointerleave', clearTimer);
    imgEl.addEventListener('pointercancel', clearTimer);
  }

  _executeAction(actionType) {
    const actions = this.config.actions || {};
    // Standardmäßig öffnen wir bei Tap & Hold den Mehr-Informationen-Dialog
    const defaultAction = 'more-info';
    const action = actions[actionType] !== undefined ? actions[actionType] : defaultAction;

    if (action === 'more-info') {
      const event = new CustomEvent("hass-more-info", {
        detail: { entityId: this.config.entity },
        bubbles: true,
        composed: true,
      });
      this.dispatchEvent(event);
    }
    // 'none' tut bewusst nichts
  }
}

customElements.define('person-details-card-dev', PersonDetailsCard);

// ==========================================
// DER NATIVE HA-EDITOR
// ==========================================
class PersonDetailsCardEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._initialized = false;
    this._locationsExpanded = false;
    this._sensorsExpanded = false;
    this._actionsExpanded = false;
    this._selectedDevice = null;
  }

  setConfig(config) {
    this._config = config || {};
    if (!this._initialized) {
      this._render();
    } else {
      this._updateValues();
    }
  }

  set hass(hass) {
    this._hass = hass;
    if (this._initialized) {
      this._setupAllPickers();
      this._updateDeviceContainer();
    }
  }

  _render() {
    if (!this._config) return;

    const locPanel = this.shadowRoot.querySelector('#locations-panel');
    if (locPanel) this._locationsExpanded = locPanel.expanded;

    const sensorPanel = this.shadowRoot.querySelector('#sensors-panel');
    if (sensorPanel) this._sensorsExpanded = sensorPanel.expanded;

    const actionPanel = this.shadowRoot.querySelector('#actions-panel');
    if (actionPanel) this._actionsExpanded = actionPanel.expanded;

    let allZones = ['home', 'not_home'];
    if (this._hass && this._hass.states) {
      const zones = Object.keys(this._hass.states)
        .filter(entityId => entityId.startsWith('zone.'))
        .map(entityId => {
          const stateObj = this._hass.states[entityId];
          return stateObj.attributes.friendly_name || entityId.replace('zone.', '');
        });
      allZones = Array.from(new Set([...allZones, ...zones]));
    }

    const config = this._config;
    const locationColors = config.location_colors || [];
    const actions = config.actions || {};

    let locationRowsHtml = '';
    locationColors.forEach((item, index) => {
      locationRowsHtml += `
        <div class="location-row" data-index="${index}">
          <select class="zone-select"></select>
          <div class="color-picker-wrapper">
            <input type="color" class="color-input" value="${item.color || '#3498db'}">
          </div>
          <button type="button" class="delete-btn" title="Entfernen">
            <ha-icon icon="mdi:delete"></ha-icon>
          </button>
        </div>
      `;
    });

    this.shadowRoot.innerHTML = `
      <style>
        .card-config {
          display: flex;
          flex-direction: column;
          gap: 16px;
          padding: 8px 0;
          color: var(--primary-text-color);
        }
        ha-entity-picker {
          width: 100%;
        }
        ha-expansion-panel {
          background: var(--secondary-background-color);
          border-radius: 8px;
          overflow: hidden;
        }
        .panel-content {
          display: flex;
          flex-direction: column;
          gap: 16px;
          padding: 12px 8px;
        }
        .device-info-box {
          background: var(--card-background-color, var(--secondary-background-color));
          padding: 10px 14px;
          border-radius: 6px;
          border: 1px solid var(--divider-color);
          font-size: 13px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .error-msg {
          color: var(--error-color, #db4437);
          font-weight: 500;
        }
        .device-select, .action-select {
          background: var(--primary-background-color);
          color: var(--primary-text-color);
          border: 1px solid var(--divider-color);
          border-radius: 4px;
          padding: 8px 12px;
          font-size: 13px;
          width: 100%;
          outline: none;
        }
        .action-row {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .action-label {
          font-size: 13px;
          font-weight: 500;
        }
        .location-container {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .location-row {
          display: flex;
          gap: 10px;
          align-items: center;
          background: var(--card-background-color, var(--secondary-background-color));
          padding: 8px 12px;
          border-radius: 8px;
          border: 1px solid var(--divider-color);
        }
        .zone-select {
          flex: 1;
          background: var(--primary-background-color);
          color: var(--primary-text-color);
          border: 1px solid var(--divider-color);
          border-radius: 4px;
          padding: 8px 12px;
          font-size: 14px;
          outline: none;
        }
        .color-picker-wrapper {
          display: flex;
          align-items: center;
        }
        .color-input {
          width: 36px;
          height: 36px;
          border: 1px solid var(--divider-color);
          border-radius: 4px;
          cursor: pointer;
          background: none;
          padding: 0;
        }
        .delete-btn {
          background: none;
          border: none;
          color: var(--error-color, #db4437);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 6px;
          border-radius: 4px;
        }
        .delete-btn:hover {
          background: rgba(219, 68, 55, 0.1);
        }
        .add-btn {
          margin-top: 4px;
          background: var(--primary-color);
          color: var(--text-primary-color, white);
          border: none;
          border-radius: 4px;
          padding: 10px 16px;
          font-weight: 500;
          cursor: pointer;
          font-size: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .add-btn:hover {
          opacity: 0.9;
        }
      </style>

      <div class="card-config">
        <!-- Person Entität -->
        <ha-entity-picker id="input_entity"></ha-entity-picker>

        <!-- Dynamischer Bereich für gefundene Geräte -->
        <div id="device-container"></div>

        <!-- Foto-Aktionen Panel -->
        <ha-expansion-panel id="actions-panel" header="Aktionen für Profilbild" ${this._actionsExpanded ? 'expanded' : ''}>
          <div class="panel-content">
            <div class="action-row">
              <span class="action-label">Aktion beim Klicken (Tap)</span>
              <select id="input_tap_action" class="action-select">
                <option value="more-info" ${actions.tap_action === 'more-info' || !actions.tap_action ? 'selected' : ''}>Mehr Informationen (More-Info Dialog)</option>
                <option value="none" ${actions.tap_action === 'none' ? 'selected' : ''}>Nichts tun</option>
              </select>
            </div>
            <div class="action-row">
              <span class="action-label">Aktion beim Halten (Hold)</span>
              <select id="input_hold_action" class="action-select">
                <option value="more-info" ${actions.hold_action === 'more-info' || !actions.hold_action ? 'selected' : ''}>Mehr Informationen (More-Info Dialog)</option>
                <option value="none" ${actions.hold_action === 'none' ? 'selected' : ''}>Nichts tun</option>
              </select>
            </div>
          </div>
        </ha-expansion-panel>

        <!-- Sensoren Panel -->
        <ha-expansion-panel id="sensors-panel" header="Sensoren" ${this._sensorsExpanded ? 'expanded' : ''}>
          <div class="panel-content">
            <ha-entity-picker id="input_battery_level"></ha-entity-picker>
            <ha-entity-picker id="input_battery_state"></ha-entity-picker>
            <ha-entity-picker id="input_wifi"></ha-entity-picker>
            <ha-entity-picker id="input_proximity"></ha-entity-picker>
          </div>
        </ha-expansion-panel>

        <!-- Orte & Rahmenfarben Panel -->
        <ha-expansion-panel id="locations-panel" header="Orte & Rahmenfarben" ${this._locationsExpanded ? 'expanded' : ''}>
          <div class="panel-content">
            <div class="location-container">
              ${locationRowsHtml}
              <button type="button" id="add-location-btn" class="add-btn">
                <ha-icon icon="mdi:plus"></ha-icon> Ort hinzufügen
              </button>
            </div>
          </div>
        </ha-expansion-panel>
      </div>
    `;

    this._initialized = true;

    this.shadowRoot.querySelectorAll('.location-row').forEach((row, rowIndex) => {
      const item = locationColors[rowIndex];
      const select = row.querySelector('.zone-select');
      
      const defaultOpt = document.createElement('option');
      defaultOpt.value = "";
      defaultOpt.textContent = "-- Ort wählen --";
      select.appendChild(defaultOpt);

      allZones.forEach(z => {
        const opt = document.createElement('option');
        opt.value = z;
        opt.textContent = z;
        if (item && item.zone === z) {
          opt.selected = true;
        }
        select.appendChild(opt);
      });
    });

    this._setupAllPickers();
    this._attachLocationListeners();
    this._attachActionListeners();
    this._updateDeviceContainer();
  }

  _setupAllPickers() {
    if (!this._hass) return;
    const config = this._config || {};
    const variables = config.variables || {};

    const setupPicker = (id, label, includeDomains, val) => {
      const picker = this.shadowRoot.getElementById(id);
      if (picker) {
        picker.label = label;
        picker.includeDomains = includeDomains;
        picker.hass = this._hass;
        if (picker.value !== val) {
          picker.value = val || '';
        }
        if (!picker._boundHandler) {
          picker._boundHandler = () => {
            if (id === 'input_entity') {
              this._updateDeviceContainer();
            }
            this._valueChanged();
          };
          picker.addEventListener('value-changed', picker._boundHandler);
        }
      }
    };

    setupPicker('input_entity', 'Person', ['person'], config.entity);
    setupPicker('input_battery_level', 'Batterie Level Sensor', ['sensor'], variables.battery_level);
    setupPicker('input_battery_state', 'Batterie State Sensor (Ladezustand)', ['sensor'], variables.battery_state);
    setupPicker('input_wifi', 'WLAN Sensor (SSID)', ['sensor'], variables.wifi);
    setupPicker('input_proximity', 'Proximity Sensor (Entfernung)', ['sensor'], variables.proximity);
  }

  _attachActionListeners() {
    const tapSelect = this.shadowRoot.getElementById('input_tap_action');
    const holdSelect = this.shadowRoot.getElementById('input_hold_action');

    if (tapSelect) {
      tapSelect.addEventListener('change', () => this._valueChanged());
    }
    if (holdSelect) {
      holdSelect.addEventListener('change', () => this._valueChanged());
    }
  }

  _updateDeviceContainer() {
    const container = this.shadowRoot.getElementById('device-container');
    if (!container || !this._hass) return;

    container.innerHTML = '';

    const personPicker = this.shadowRoot.getElementById('input_entity');
    const personId = personPicker ? personPicker.value : this._config.entity;

    if (!personId || !this._hass.states[personId]) return;

    const personState = this._hass.states[personId];
    const devices = personState.attributes.device_trackers || (personState.attributes.source ? [personState.attributes.source] : []);

    const box = document.createElement('div');
    box.className = 'device-info-box';

    if (!devices || devices.length === 0) {
      const err = document.createElement('span');
      err.className = 'error-msg';
      err.textContent = 'Kein Gerät vorhanden, bitte in den Einstellungen eintragen!';
      box.appendChild(err);
    } else if (devices.length === 1) {
      const info = document.createElement('span');
      info.textContent = `Verknüpftes Gerät: ${devices[0]}`;
      box.appendChild(info);
      this._autoFillSensors(devices[0]);
    } else {
      const label = document.createElement('span');
      label.textContent = 'Mehrere Geräte vorhanden, bitte auswählen:';
      box.appendChild(label);

      const select = document.createElement('select');
      select.className = 'device-select';

      const defaultOpt = document.createElement('option');
      defaultOpt.value = '';
      defaultOpt.textContent = '-- Gerät wählen --';
      select.appendChild(defaultOpt);

      devices.forEach(dev => {
        const opt = document.createElement('option');
        opt.value = dev;
        opt.textContent = dev;
        if (this._selectedDevice === dev) {
          opt.selected = true;
        }
        select.appendChild(opt);
      });

      select.addEventListener('change', (e) => {
        this._selectedDevice = e.target.value;
        if (this._selectedDevice) {
          this._autoFillSensors(this._selectedDevice);
        }
      });

      box.appendChild(select);
    }

    container.appendChild(box);
  }

  _autoFillSensors(deviceEntityId) {
    if (!deviceEntityId || !this._hass || !this._hass.states) return;
    
    const deviceObjId = deviceEntityId.replace('device_tracker.', '');

    const findMatchingSensor = (suffixes) => {
      for (const suffix of suffixes) {
        const candidate = `sensor.${deviceObjId}_${suffix}`;
        if (this._hass.states[candidate]) {
          return candidate;
        }
      }
      return '';
    };

    const batteryLevel = findMatchingSensor(['battery_level', 'battery']);
    const batteryState = findMatchingSensor(['battery_state', 'charger_type', 'is_charging']);
    const wifi = findMatchingSensor(['wifi_connection', 'ssid', 'connection_type']);

    if (batteryLevel) {
      const el = this.shadowRoot.getElementById('input_battery_level');
      if (el) el.value = batteryLevel;
    }
    if (batteryState) {
      const el = this.shadowRoot.getElementById('input_battery_state');
      if (el) el.value = batteryState;
    }
    if (wifi) {
      const el = this.shadowRoot.getElementById('input_wifi');
      if (el) el.value = wifi;
    }

    this._valueChanged();
  }

  _updateValues() {
    this._setupAllPickers();
    this._updateDeviceContainer();
  }

  _attachLocationListeners() {
    this.shadowRoot.querySelectorAll('.location-row').forEach(row => {
      const index = parseInt(row.dataset.index);
      const select = row.querySelector('.zone-select');
      const colorInput = row.querySelector('.color-input');
      const deleteBtn = row.querySelector('.delete-btn');

      select.addEventListener('change', (e) => {
        const val = e.target.value;
        this._updateLocationColor(index, val, colorInput.value);
        
        const locationColors = this._config.location_colors || [];
        if (val && index === locationColors.length - 1) {
          this._addEmptyLocation();
        }
      });

      colorInput.addEventListener('input', (e) => {
        this._updateLocationColor(index, select.value, e.target.value);
      });

      deleteBtn.addEventListener('click', () => {
        this._removeLocation(index);
      });
    });

    const addBtn = this.shadowRoot.getElementById('add-location-btn');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        this._addEmptyLocation();
      });
    }
  }

  _addEmptyLocation() {
    const config = JSON.parse(JSON.stringify(this._config));
    config.location_colors = config.location_colors || [];
    config.location_colors.push({ zone: '', color: '#3498db' });
    this._config = config;
    this._render();
    this._valueChanged();
  }

  _updateLocationColor(index, zone, color) {
    const config = JSON.parse(JSON.stringify(this._config));
    config.location_colors = config.location_colors || [];
    if (config.location_colors[index]) {
      config.location_colors[index] = { zone, color };
    }
    this._config = config;
    this._valueChanged();
  }

  _removeLocation(index) {
    const config = JSON.parse(JSON.stringify(this._config));
    config.location_colors = config.location_colors || [];
    config.location_colors.splice(index, 1);
    this._config = config;
    this._render();
    this._valueChanged();
  }

  _valueChanged() {
    if (!this._config || !this._hass) return;

    const getVal = (id) => {
      const el = this.shadowRoot.getElementById(id);
      return el ? el.value : '';
    };

    const config = this._config;

    const newConfig = {
      type: 'custom:person-details-card-dev',
      entity: getVal('input_entity'),
      variables: {
        battery_level: getVal('input_battery_level'),
        battery_state: getVal('input_battery_state'),
        wifi: getVal('input_wifi'),
        proximity: getVal('input_proximity')
      },
      actions: {
        tap_action: getVal('input_tap_action') || 'more-info',
        hold_action: getVal('input_hold_action') || 'more-info'
      },
      location_colors: config.location_colors || []
    };

    this._config = newConfig;

    const event = new CustomEvent('config-changed', {
      detail: { config: newConfig },
      bubbles: true,
      composed: true,
    });
    this.dispatchEvent(event);
  }
}

customElements.define('person-details-card-dev-editor', PersonDetailsCardEditor);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "person-details-card-dev",
  name: "Person Details Karte (DEV)",
  description: "Zeigt das Profilbild, Status, Batterie, WLAN und Entfernung einer Person an.",
  preview: false,
  documentationURL: "https://github.com"
});
