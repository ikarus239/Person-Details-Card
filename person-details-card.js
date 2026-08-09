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

    // Variablen aus der Dashboard-Konfiguration auslesen (Batterie, WLAN, Proximity)
    const vars = this.config.variables || {};
    
    // 1. Batterie-Daten auslesen
    let batteryLvl = "–";
    let batteryColor = "#77c66e";
    let batteryIcon = "mdi:battery";
    if (vars.battery_level && hass.states[vars.battery_level]) {
      batteryLvl = hass.states[vars.battery_level].state;
      const numLvl = parseFloat(batteryLvl);
      if (numLvl < 10) batteryColor = "#ef4f1a";
      else if (numLvl < 25) batteryColor = "#ffa500";
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
      if (ssid && ssid !== "unknown" && ssid !== "unavailable") {
        wifiText = ssid;
        wifiIcon = "mdi:wifi";
      }
    }

    // 3. Proximity (Entfernung) auslesen
    let proximityText = "–";
    if (vars.proximity && hass.states[vars.proximity]) {
      const d = parseFloat(hass.states[vars.proximity].state);
      proximityText = isNaN(d) ? "–" : (d / 1000).toFixed(1) + " km";
    }

    // Rahmenfarbe bestimmen
    let rahmenFarbe = "#dedede";
    if (status === "home") rahmenFarbe = "#77c66e";
    if (status === "School") rahmenFarbe = "#964b00";
    if (status === "Rosenbauer") rahmenFarbe = "deepskyblue";
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
