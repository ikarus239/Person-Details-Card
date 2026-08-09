class PersonDetailsCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' }); 
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
    return document.createElement('person-details-card-editor');
  }

  static getStubConfig() {
    return { entity: "person.rudolf" };
  }

  set hass(hass) {
    const personId = this.config.entity;
    const personDaten = hass.states[personId];

    if (!personDaten) {
      this.shadowRoot.innerHTML = `<ha-card><div style="padding: 20px; color: white;">Person nicht gefunden!</div></ha-card>`;
      return;
    }

    const status = personDaten.state;
    const bildUrl = personDaten.attributes.entity_picture;
    const name = personDaten.attributes.friendly_name;

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
          border: 5px solid ${rahmenFarbe};
          object-fit: cover;
          box-sizing: border-box;
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
        <img class="profilbild" src="${bildUrl}" alt="Profilbild">
        
        <div class="details">
          <div class="zeile">
            <ha-icon icon="${statusIcon}" style="color: white;"></ha-icon>
            <span class="text-white" style="text-transform: capitalize; font-weight: bold;">${status}</span>
          </div>
          <div class="zeile">
            <ha-icon icon="${batteryIcon}" style="color: ${batteryColor};"></ha-icon>
            <span class="text-white">${batteryLvl}% battery</span>
          </div>
          <div class="zeile">
            <ha-icon icon="${wifiIcon}" style="color: ${wifiColor};"></ha-icon>
            <span class="text-white">${wifiText}</span>
          </div>
          <div class="zeile">
            <ha-icon icon="mdi:map-marker-distance" style="color: white;"></ha-icon>
            <span class="text-white">${proximityText}</span>
          </div>
        </div>
      </ha-card>
    `;
  }
}

customElements.define('person-details-card', PersonDetailsCard);

// ==========================================
// DER NATIVE HA-EDITOR
// ==========================================
class PersonDetailsCardEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._initialized = false;
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
    // Verhindert das ständige Neuladen/Zurücksetzen, indem nur HASS an die Picker übergeben wird
    const pickers = this.shadowRoot.querySelectorAll('ha-entity-picker');
    pickers.forEach(picker => {
      picker.hass = hass;
    });
  }

  _render() {
    if (!this._config) return;

    // Verfügbare Zonen aus Home Assistant auslesen
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
    const variables = config.variables || {};
    const locationColors = config.location_colors || [];

    let locationRowsHtml = '';
    locationColors.forEach((item, index) => {
      let optionsHtml = `<option value="">-- Ort wählen --</option>`;
      allZones.forEach(z => {
        const selected = item.zone === z ? 'selected' : '';
        optionsHtml += `<option value="${z}" ${selected}>${z}</option>`;
      });

      locationRowsHtml += `
        <div class="location-row" data-index="${index}">
          <select class="zone-select">
            ${optionsHtml}
          </select>
          <div class="color-picker-wrapper">
            <input type="color" class="color-input" value="${item.color || '#3498db'}">
          </div>
          <ha-icon-button class="delete-btn" icon="mdi:delete" title="Entfernen"></ha-icon-button>
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
          --mdc-icon-button-size: 36px;
          color: var(--error-color, #db4437);
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
        <!-- Person Entität (außerhalb der Panels) -->
        <ha-entity-picker id="input_entity"></ha-entity-picker>

        <!-- Sensoren Panel -->
        <ha-expansion-panel header="Sensoren">
          <div class="panel-content">
            <ha-entity-picker id="input_battery_level"></ha-entity-picker>
            <ha-entity-picker id="input_battery_state"></ha-entity-picker>
            <ha-entity-picker id="input_wifi"></ha-entity-picker>
            <ha-entity-picker id="input_proximity"></ha-entity-picker>
          </div>
        </ha-expansion-panel>

        <!-- Orte & Rahmenfarben Panel -->
        <ha-expansion-panel header="Orte & Rahmenfarben">
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

    // Picker-Eigenschaften setzen
    const setupPicker = (id, label, includeDomains, val) => {
      const picker = this.shadowRoot.getElementById(id);
      if (picker) {
        picker.label = label;
        picker.includeDomains = includeDomains;
        if (this._hass) picker.hass = this._hass;
        picker.value = val || '';
        picker.addEventListener('value-changed', () => this._valueChanged());
      }
    };

    setupPicker('input_entity', 'Person', ['person'], config.entity);
    setupPicker('input_battery_level', 'Batterie Level Sensor', ['sensor'], variables.battery_level);
    setupPicker('input_battery_state', 'Batterie State Sensor (Ladezustand)', ['sensor'], variables.battery_state);
    setupPicker('input_wifi', 'WLAN Sensor (SSID)', ['sensor'], variables.wifi);
    setupPicker('input_proximity', 'Proximity Sensor (Entfernung)', ['sensor'], variables.proximity);

    this._attachLocationListeners();
  }

  _updateValues() {
    const config = this._config;
    const variables = config.variables || {};

    const setVal = (id, val) => {
      const el = this.shadowRoot.getElementById(id);
      if (el && el.value !== val) el.value = val || '';
    };

    setVal('input_entity', config.entity);
    setVal('input_battery_level', variables.battery_level);
    setVal('input_battery_state', variables.battery_state);
    setVal('input_wifi', variables.wifi);
    setVal('input_proximity', variables.proximity);
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
    this._initialized = false; 
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
    this._initialized = false; 
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
      type: 'custom:person-details-card',
      entity: getVal('input_entity'),
      variables: {
        battery_level: getVal('input_battery_level'),
        battery_state: getVal('input_battery_state'),
        wifi: getVal('input_wifi'),
        proximity: getVal('input_proximity')
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

customElements.define('person-details-card-editor', PersonDetailsCardEditor);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "person-details-card",
  name: "Person Details Karte",
  description: "Zeigt das Profilbild, Status, Batterie, WLAN und Entfernung einer Person an.",
  preview: false,
  documentationURL: "https://github.com"
});
