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

  // Teilt Home Assistant die Standard-Kartengröße (Höhe/Breite) mit
  static getCardSize() {
    return 6;
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
    
    // 1. Batterie-Logik (Farben & Icons nach Zustand)
    let batteryLvl = "–";
    let batteryColor = "#77c66e"; // Grün ab 30%
    let batteryIcon = "mdi:battery";
    
    if (vars.battery_level && hass.states[vars.battery_level]) {
      batteryLvl = hass.states[vars.battery_level].state;
      const numLvl = parseFloat(batteryLvl);
      if (!isNaN(numLvl)) {
        if (numLvl < 10) {
          batteryColor = "#ef4f1a"; // Rot unter 10%
        } else if (numLvl < 30) {
          batteryColor = "#ffa500"; // Orange unter 30%
        }

        // Dynamisches Icon je nach Akkustand
        if (numLvl >= 95) batteryIcon = "mdi:battery";
        else if (numLvl <= 5) batteryIcon = "mdi:battery-outline";
        else {
          const rounded = Math.floor(numLvl / 10) * 10;
          batteryIcon = `mdi:battery-${rounded}`;
        }
      }
    }

    // Ladezustand prüfen
    if (vars.battery_state && hass.states[vars.battery_state]) {
      const bState = hass.states[vars.battery_state].state;
      if (bState === 'charging' || bState === 'True' || bState === 'on') {
        batteryIcon = "mdi:battery-charging";
      }
    }

    // 2. WLAN-Logik (Grün = verbunden, Rot = getrennt)
    let wifiText = "–";
    let wifiIcon = "mdi:wifi-off";
    let wifiColor = "#ef4f1a"; // Rot bei nicht verbunden
    if (vars.wifi && hass.states[vars.wifi]) {
      const ssid = hass.states[vars.wifi].state;
      if (ssid && ssid !== "unknown" && ssid !== "unavailable" && ssid !== "None" && ssid !== "" && ssid !== "Off") {
        wifiText = ssid;
        wifiIcon = "mdi:wifi";
        wifiColor = "#77c66e"; // Grün bei Verbindung
      } else {
        wifiText = "Offline";
        wifiIcon = "mdi:wifi-off";
        wifiColor = "#ef4f1a";
      }
    }

    // 3. Proximity (Entfernung)
    let proximityText = "–";
    if (vars.proximity && hass.states[vars.proximity]) {
      const rawVal = hass.states[vars.proximity].state;
      const d = parseFloat(rawVal);
      proximityText = isNaN(d) ? rawVal : (d / 1000).toFixed(1) + " km";
    }

    // Rahmenfarbe für das Profilbild
    let rahmenFarbe = "#dedede";
    if (status === "home") rahmenFarbe = "#77c66e";
    if (status === "School") rahmenFarbe = "#964b00";
    if (status === "Rosenbauer") rahmenFarbe = "deepskyblue";
    if (status === "Hospital") rahmenFarbe = "#005f5f";
    if (status === "Fire Brigade") rahmenFarbe = "#b22222";
    if (status.startsWith("Familie")) rahmenFarbe = "#e2b007";

    const icons = {
      home: "mdi:home",
      not_home: "mdi:home-export-outline",
      "School": "mdi:school",
      "Hospital": "mdi:hospital",
      "Fire Brigade": "mdi:fire-truck",
      "Rosenbauer": "mdi:fire-station"
    };
    const statusIcon = icons[status] || "mdi:map-marker-radius";

    this.shadowRoot.innerHTML = `
      <style>
        ha-card {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(15px);
          -webkit-backdrop-filter: blur(15px);
          border-radius: 10px !important;
          box-shadow: none;
          padding: 15px;
          display: grid;
          grid-template-columns: 2fr 3fr;
          grid-template-areas: "icon details";
          gap: 10px;
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
          gap: 6px;
          font-size: 11px;
        }

        .zeile {
          display: flex;
          align-items: center; /* Zentriert Symbol und Text vertikal zueinander */
          gap: 10px;          /* Schöner Abstand zwischen Symbol und Text */
        }

        ha-icon {
          width: 16px;
          height: 16px;
        }

        /* Alle Schriften bleiben zwingend weiß */
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
  }

  setConfig(config) {
    this._config = config || {};
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  _render() {
    if (!this._config || !this._hass) return;
    
    if (this._rendered) {
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
      return;
    }

    const config = this._config;
    const variables = config.variables || {};

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
      </style>

      <div class="card-config">
        <ha-entity-picker
          id="input_entity"
          label="Person"
          .hass="${this._hass}"
          .value="${config.entity || ''}"
          .includeDomains="${['person']}"
        ></ha-entity-picker>

        <ha-entity-picker
          id="input_battery_level"
          label="Batterie Level Sensor"
          .hass="${this._hass}"
          .value="${variables.battery_level || ''}"
          .includeDomains="${['sensor']}"
        ></ha-entity-picker>

        <ha-entity-picker
          id="input_battery_state"
          label="Batterie State Sensor (Ladezustand)"
          .hass="${this._hass}"
          .value="${variables.battery_state || ''}"
          .includeDomains="${['sensor']}"
        ></ha-entity-picker>

        <ha-entity-picker
          id="input_wifi"
          label="WLAN Sensor (SSID)"
          .hass="${this._hass}"
          .value="${variables.wifi || ''}"
          .includeDomains="${['sensor']}"
        ></ha-entity-picker>

        <ha-entity-picker
          id="input_proximity"
          label="Proximity Sensor (Entfernung)"
          .hass="${this._hass}"
          .value="${variables.proximity || ''}"
          .includeDomains="${['sensor']}"
        ></ha-entity-picker>
      </div>
    `;

    this._rendered = true;

    this.shadowRoot.querySelectorAll('ha-entity-picker').forEach(picker => {
      picker.addEventListener('value-changed', () => this._valueChanged());
    });
  }

  _valueChanged() {
    if (!this._config || !this._hass) return;

    const getVal = (id) => {
      const el = this.shadowRoot.getElementById(id);
      return el ? el.value : '';
    };

    const newConfig = {
      type: 'custom:person-details-card',
      entity: getVal('input_entity'),
      variables: {
        battery_level: getVal('input_battery_level'),
        battery_state: getVal('input_battery_state'),
        wifi: getVal('input_wifi'),
        proximity: getVal('input_proximity')
      }
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
