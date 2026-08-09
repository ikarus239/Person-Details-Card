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
// DER VISUELLE EDITOR FÜR DIE KARTE
// ==========================================
class PersonDetailsCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = config;
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._content) {
      this._render();
    }
  }

  _render() {
    this.innerHTML = `
      <div style="padding: 10px; display: flex; flex-direction: column; gap: 12px;">
        <p style="margin: 0; font-weight: bold; color: var(--primary-text-color);">Personen-Karte Konfiguration</p>
        
        <!-- Eingabe für die Person -->
        <div>
          <label style="display: block; margin-bottom: 4px; font-size: 12px;">Person Entität (z.B. person.rudolf)</label>
          <input type="text" id="input_entity" value="${this._config.entity || ''}" style="width: 100%; padding: 8px; box-sizing: border-box;" />
        </div>

        <hr style="border: 0; border-top: 1px solid var(--divider-color); margin: 5px 0;">

        <!-- Sensoren -->
        <div>
          <label style="display: block; margin-bottom: 4px; font-size: 12px;">Batterie Level Sensor</label>
          <input type="text" id="input_battery_level" value="${this._config.variables?.battery_level || ''}" style="width: 100%; padding: 8px; box-sizing: border-box;" />
        </div>

        <div>
          <label style="display: block; margin-bottom: 4px; font-size: 12px;">Batterie State Sensor (Ladezustand)</label>
          <input type="text" id="input_battery_state" value="${this._config.variables?.battery_state || ''}" style="width: 100%; padding: 8px; box-sizing: border-box;" />
        </div>

        <div>
          <label style="display: block; margin-bottom: 4px; font-size: 12px;">WLAN Sensor (SSID)</label>
          <input type="text" id="input_wifi" value="${this._config.variables?.wifi || ''}" style="width: 100%; padding: 8px; box-sizing: border-box;" />
        </div>

        <div>
          <label style="display: block; margin-bottom: 4px; font-size: 12px;">Proximity Sensor (Entfernung)</label>
          <input type="text" id="input_proximity" value="${this._config.variables?.proximity || ''}" style="width: 100%; padding: 8px; box-sizing: border-box;" />
        </div>
      </div>
    `;

    this._content = true;

    // Wenn der Nutzer etwas ändert, schicken wir die Daten an Home Assistant zurück
    this.querySelectorAll('input').forEach(input => {
      input.addEventListener('input', () => this._valueChanged());
    });
  }

  _valueChanged() {
    if (!this._config || !this._hass) return;

    const newConfig = {
      type: 'custom:person-details-card',
      entity: this.querySelector('#input_entity').value,
      variables: {
        battery_level: this.querySelector('#input_battery_level').value,
        battery_state: this.querySelector('#input_battery_state').value,
        wifi: this.querySelector('#input_wifi').value,
        proximity: this.querySelector('#input_proximity').value
      }
    };

    // Wir sagen Home Assistant, dass sich die Konfiguration geändert hat
    const event = new CustomEvent('config-changed', {
      detail: { config: newConfig },
      bubbles: true,
      composed: true,
    });
    this.dispatchEvent(event);
  }
}

// Dem Browser sagen, wie der Editor heißt
customElements.define('person-details-card-editor', PersonDetailsCardEditor);
