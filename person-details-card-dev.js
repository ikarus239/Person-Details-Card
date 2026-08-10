class PersonDetailsCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' }); 
    this._renderedCard = false;
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
    return {};
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
            cursor: pointer;
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

        <ha-card id="main-card">
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
      this._attachActionListeners();
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

  _attachActionListeners() {
    const imgEl = this.shadowRoot.querySelector('.profilbild');
    const cardEl = this.shadowRoot.getElementById('main-card');

    const bindTarget = (targetEl, targetName) => {
      if (!targetEl) return;
      let pressTimer = null;
      let clickCount = 0;
      let clickTimer = null;

      const clearAll = () => {
        if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; }
        if (clickTimer) { clearTimeout(clickTimer); clickTimer = null; }
      };

      targetEl.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        clearAll();
        pressTimer = setTimeout(() => {
          pressTimer = null;
          this._executeAction('hold_action', targetName);
        }, 600);
      });

      targetEl.addEventListener('pointerup', (e) => {
        e.stopPropagation();
        if (pressTimer) {
          clearAll();
          clickCount++;
          if (clickCount === 1) {
            clickTimer = setTimeout(() => {
              clickCount = 0;
              this._executeAction('tap_action', targetName);
            }, 250);
          } else if (clickCount === 2) {
            clearAll();
            clickCount = 0;
            this._executeAction('double_tap_action', targetName);
          }
        }
      });

      targetEl.addEventListener('pointercancel', clearAll);
      targetEl.addEventListener('pointerleave', clearAll);
    };

    bindTarget(imgEl, 'icon');
    bindTarget(cardEl, 'card');
  }

  _executeAction(actionType, targetName) {
    const actions = this.config.actions || {};
    const targetActions = actions[targetName] || {};
    const rawActionConfig = targetActions[actionType];

    let action = 'default';
    let path = '';
    let url = '';

    if (typeof rawActionConfig === 'object' && rawActionConfig !== null) {
      action = rawActionConfig.action || 'default';
      path = rawActionConfig.navigation_path || rawActionConfig.path || '';
      url = rawActionConfig.url_path || rawActionConfig.url || '';
    } else if (typeof rawActionConfig === 'string') {
      action = rawActionConfig;
      path = targetActions[`${actionType}_path`] || '';
      url = targetActions[`${actionType}_url`] || '';
    }

    if (action === 'default') {
      action = (targetName === 'icon') ? 'more-info' : 'none';
    }

    if (action === 'more-info') {
      const event = new CustomEvent("hass-more-info", {
        detail: { entityId: this.config.entity },
        bubbles: true,
        composed: true,
      });
      this.dispatchEvent(event);
    } else if (action === 'navigate' && path) {
      history.pushState(null, '', path);
      window.dispatchEvent(new Event('location-change'));
    } else if (action === 'url' && url) {
      window.open(url, '_blank');
    }
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
    this._interactionsExpanded = false;
    this._sensorsExpanded = false;
    this._locationsExpanded = false;
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

    const interPanel = this.shadowRoot.querySelector('#interactions-panel');
    if (interPanel) this._interactionsExpanded = interPanel.expanded;

    const locPanel = this.shadowRoot.querySelector('#locations-panel');
    if (locPanel) this._locationsExpanded = locPanel.expanded;

    const sensorPanel = this.shadowRoot.querySelector('#sensors-panel');
    if (sensorPanel) this._sensorsExpanded = sensorPanel.expanded;

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
    const iconActions = actions.icon || {};
    const cardActions = actions.card || {};

    const getActionData = (targetObj, actionKey) => {
      const val = targetObj[actionKey];
      if (typeof val === 'object' && val !== null) {
        return {
          action: val.action || 'default',
          path: val.navigation_path || val.path || '',
          url: val.url_path || val.url || ''
        };
      }
      return {
        action: val || 'default',
        path: targetObj[`${actionKey}_path`] || '',
        url: targetObj[`${actionKey}_url`] || ''
      };
    };

    const renderActionRow = (prefix, labelText, actionData, isIcon) => {
      const actVal = actionData.action || 'default';
      const pathVal = actionData.path || '';
      const urlVal = actionData.url || '';
      const defText = isIcon ? "Standard (Detailansicht)" : "Standard (Nichts)";

      return `
        <div class="action-block">
          <div class="action-label">${labelText}</div>
          <select id="${prefix}_action" class="action-select">
            <option value="default" ${actVal === 'default' ? 'selected' : ''}>${defText}</option>
            <option value="more-info" ${actVal === 'more-info' ? 'selected' : ''}>Detailansicht</option>
            <option value="navigate" ${actVal === 'navigate' ? 'selected' : ''}>Navigieren</option>
            <option value="url" ${actVal === 'url' ? 'selected' : ''}>URL</option>
            <option value="none" ${actVal === 'none' ? 'selected' : ''}>nichts</option>
          </select>
          <div id="${prefix}_path_container" class="conditional-field" style="display: ${actVal === 'navigate' ? 'block' : 'none'};">
            <div class="sub-label">Navigationspfad</div>
            <input type="text" id="${prefix}_path" class="action-input" value="${pathVal}" placeholder="/lovelace/dashboard">
          </div>
          <div id="${prefix}_url_container" class="conditional-field" style="display: ${actVal === 'url' ? 'block' : 'none'};">
            <div class="sub-label">Ziel-URL</div>
            <input type="text" id="${prefix}_url" class="action-input" value="${urlVal}" placeholder="https://example.com">
          </div>
        </div>
      `;
    };

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
          font-family: inherit;
        }
        ha-entity-picker {
          width: 100%;
        }
        ha-expansion-panel {
          background: var(--card-background-color, var(--secondary-background-color));
          border-radius: 8px;
          border: 1px solid var(--divider-color, #e0e0e0);
          overflow: hidden;
        }
        .panel-content {
          display: flex;
          flex-direction: column;
          gap: 14px;
          padding: 12px 14px;
        }
        .action-block {
          display: flex;
          flex-direction: column;
          gap: 6px;
          background: var(--secondary-background-color, rgba(0,0,0,0.03));
          padding: 10px;
          border-radius: 6px;
          border: 1px solid var(--divider-color, rgba(0,0,0,0.08));
        }
        .action-label {
          font-size: 13px;
          font-weight: 500;
          color: var(--primary-text-color);
        }
        .sub-label {
          font-size: 12px;
          color: var(--secondary-text-color, #666);
          margin-top: 4px;
          margin-bottom: 2px;
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
        .device-select, .action-select, .action-input, .zone-select {
          background: var(--card-background-color, var(--primary-background-color));
          color: var(--primary-text-color);
          border: 1px solid var(--divider-color, #ccc);
          border-radius: 4px;
          padding: 8px 10px;
          font-size: 13px;
          width: 100%;
          outline: none;
          box-sizing: border-box;
          font-family: inherit;
        }
        .action-select:focus, .action-input:focus, .zone-select:focus {
          border-color: var(--primary-color, #03a9f4);
        }
        .conditional-field {
          width: 100%;
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
        <ha-entity-picker id="input_entity"></ha-entity-picker>

        <div id="device-container"></div>

        <ha-expansion-panel id="interactions-panel" header="Interaktionen" ${this._interactionsExpanded ? 'expanded' : ''}>
          <div class="panel-content">
            
            <ha-expansion-panel header="Profilbild / Icon Interaktionen">
              <div class="panel-content">
                ${renderActionRow('icon_tap', 'Tipp-Aktion', getActionData(iconActions, 'tap_action'), true)}
                ${renderActionRow('icon_double_tap', 'Doppeltipp-Aktion', getActionData(iconActions, 'double_tap_action'), true)}${renderActionRow('icon_hold', 'Gedrückt halten-Aktion', getActionData(iconActions, 'hold_action'), true)}
              </div>
            </ha-expansion-panel>

            <ha-expansion-panel header="Karten Interaktionen">
              <div class="panel-content">
                ${renderActionRow('card_tap', 'Tipp-Aktion', getActionData(cardActions, 'tap_action'), false)}
                ${renderActionRow('card_double_tap', 'Doppeltipp-Aktion', getActionData(cardActions, 'double_tap_action'), false)}${renderActionRow('card_hold', 'Gedrückt halten-Aktion', getActionData(cardActions, 'hold_action'), false)}
              </div>
            </ha-expansion-panel>

          </div>
        </ha-expansion-panel>

        <ha-expansion-panel id="sensors-panel" header="Sensoren" ${this._sensorsExpanded ? 'expanded' : ''}>
          <div class="panel-content">
            <ha-entity-picker id="input_battery_level"></ha-entity-picker>
            <ha-entity-picker id="input_battery_state"></ha-entity-picker>
            <ha-entity-picker id="input_wifi"></ha-entity-picker>
            <ha-entity-picker id="input_proximity"></ha-entity-picker>
          </div>
        </ha-expansion-panel>

        <ha-expansion-panel id="locations-panel" header="Orte & Rahmenfarben" ${this._locationsExpanded ? 'expanded' : ''
