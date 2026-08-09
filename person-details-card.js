class PersonDetailsCard extends HTMLElement {
  // Sagt Home Assistant, welcher Editor für diese Karte genutzt werden soll
  static getConfigElement() {
    return document.createElement('person-details-card-editor');
  }

  // Ein Standard-Beispiel für den Fall, dass jemand die Karte ganz neu hinzufügt
  static getStubConfig() {
    return { entity: "person.rudolf" };
  }
  
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

  set hass(hass) {
    const personId = this.config.entity;
    const personDaten = hass.states[personId];

    if (!personDaten) {
      this.shadowRoot.innerHTML = `<ha-card><div style="padding: 20px;">Person nicht gefunden!</div></ha-card>`;
      return;
    }

    // Grundlegende Daten der Person
    const status = personDaten.state;
    const bildUrl = personDaten.attributes.entity_picture;
    const name = personDaten.attributes.friendly_name;

// Variablen aus der Dashboard-Konfiguration auslesen
    const vars = this.config.variables || {};
    
    // 1. Batterie-Daten auslesen
    let batteryLvl = "–";
    let batteryColor = "#77c66e";
    let batteryIcon = "mdi:battery";
    
    if (vars.battery_level && hass.states[vars.battery_level]) {
      batteryLvl = hass.states[vars.battery_level].state;
      const numLvl = parseFloat(batteryLvl);
      if (!isNaN(numLvl)) {
        if (numLvl < 10) batteryColor = "#ef4f1a";
        else if (numLvl < 25) batteryColor = "#ffa500";
      }
    } else {
      batteryLvl = "Err (Var)"; // Zeigt an, wenn die Variable in YAML fehlt
    }

    if (vars.battery_state && hass.states[vars.battery_state]) {
      if (hass.states[vars.battery_state].state === 'charging') {
        batteryIcon = "mdi:battery-charging";
      }
    }

    // 2. WLAN-Daten auslesen
    let wifiText = "–";
    let wifiIcon = "mdi:wifi-off";
    if (vars.wifi && hass.states[vars.wifi]) {
      const ssid = hass.states[vars.wifi].state;
      if (ssid && ssid !== "unknown" && ssid !== "unavailable" && ssid !== "None") {
        wifiText = ssid;
        wifiIcon = "mdi:wifi";
      } else {
        wifiText = "Offline";
      }
    } else {
      wifiText = "Err (Var)";
    }

    // 3. Proximity (Entfernung) auslesen
    let proximityText = "–";
    if (vars.proximity && hass.states[vars.proximity]) {
      const rawVal = hass.states[vars.proximity].state;
      const d = parseFloat(rawVal);
      proximityText = isNaN(d) ? rawVal : (d / 1000).toFixed(1) + " km";
    } else {
      proximityText = "Err (Var)";
    }

    // Rahmenfarbe bestimmen
    let rahmenFarbe = "#dedede";
    if (status === "home") rahmenFarbe = "#77c66e";
    if (status === "School") rahmenFarbe = "#964b00";
    if (status === "Rosenbauer") rahmenFarbe = "00bfff";
    if (status === "Hospital") rahmenFarbe = "#005f5f";
    if (status === "Fire Brigade") rahmenFarbe = "#b22222";
    if (status.startsWith("Familie")) rahmenFarbe = "#e2b007";

    // Status-Icon bestimmen
    const icons = {
      home: "mdi:home",
      not_home: "mdi:home-export-outline",
      "School": "mdi:school",
      "Hospital": "mdi:hospital",
      "Fire Brigade": "mdi:fire-truck",
      "Rosenbauer": "mdi:fire-station"
    };
    const statusIcon = icons[status] || "mdi:map-marker-radius";

    // HTML und CSS zusammenbauen
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
          gap: 4px;
          font-size: 11px;
        }

        .zeile {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        ha-icon {
          width: 16px;
          height: 16px;
          color: #888;
        }
      </style>

      <ha-card>
        <img class="profilbild" src="${bildUrl}" alt="Profilbild">
        
        <div class="details">
          <div class="zeile">
            <ha-icon icon="${statusIcon}"></ha-icon>
            <span style="text-transform: capitalize; font-weight: bold;">${status}</span>
          </div>
          <div class="zeile">
            <ha-icon icon="${batteryIcon}"></ha-icon>
            <span style="color: ${batteryColor};">${batteryLvl}% battery</span>
          </div>
          <div class="zeile">
            <ha-icon icon="${wifiIcon}"></ha-icon>
            <span>${wifiText}</span>
          </div>
          <div class="zeile">
            <ha-icon icon="mdi:map-marker-distance"></ha-icon>
            <span>${proximityText}</span>
          </div>
        </div>
      </ha-card>
    `;
  }
}

customElements.define('person-details-card', PersonDetailsCard);

// ==========================================
// DER NATIVE HA-EDITOR (MIT ECHTEN PICKERN)
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
    
    // Verhindern, dass der Editor bei jedem Tippen komplett neu gerendert wird und den Fokus verliert
    if (this._rendered) {
      // Nur die Werte aktualisieren, falls sie sich von außen geändert haben
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

    // Auf Änderungen in den Pickern lauschen
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
