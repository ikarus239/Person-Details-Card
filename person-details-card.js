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
    // 1. Welche Person wurde im Dashboard ausgewählt? (z.B. person.kultscher_rudolf)
    const personId = this.config.entity;
    
    // 2. Wir holen uns ALLE aktuellen Infos zu dieser Person aus Home Assistant
    const personDaten = hass.states[personId];

    // Wenn es die Person nicht gibt, brechen wir hier ab
    if (!personDaten) {
      this.shadowRoot.innerHTML = `<ha-card><div style="padding: 20px;">Person nicht gefunden!</div></ha-card>`;
      return;
    }

    // 3. Jetzt ziehen wir uns die konkreten Infos raus
    const status = personDaten.state; // z.B. "home" oder "not_home"
    const bildUrl = personDaten.attributes.entity_picture; // Das Profilbild
    const name = personDaten.attributes.friendly_name; // Der Name

    // 4. Rahmenfarbe bestimmen (Dein alter YAML-Code, übersetzt in JavaScript)
    let rahmenFarbe = "#dedede"; // Standard (Grau)
    if (status === "home") rahmenFarbe = "#77c66e"; // Grün
    if (status === "not_home") rahmenFarbe = "#dedede"; // Grau
    if (status === "School") rahmenFarbe = "#964b00"; // Braun
    if (status === "Rosenbauer") rahmenFarbe = "#00bfff"; // DeepSkyBlue
    if (status === "Hospital") rahmenFarbe = "#005f5f"; // DeepTeal
    if (status === "Fire Brigade") rahmenFarbe = "#b22222"; // Schamottrot
    if (status === "Familie Zeller") rahmenFarbe = "#e2b007"; // Goldgelb
    if (status === "Familie Schöffmann") rahmenFarbe = "#e2b007"; // Goldgelb
    if (status === "Familie Mader") rahmenFarbe = "#e2b007"; // Goldgelb

    // 5. Hier bauen wir das Aussehen (HTML) und das Design (CSS)
    this.shadowRoot.innerHTML = `
      <style>
        /* Hier stecken deine CSS-Styles aus der YAML drin! */
        ha-card {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(15px);
          -webkit-backdrop-filter: blur(15px);
          border-radius: 10px !important;
          box-shadow: none;
          padding: 10% 5%;
          display: flex;
          align-items: center;
          gap: 15px;
          color: white; /* Helle Schrift für dunklen Hintergrund */
        }
        
        .profilbild {
          width: 60px;
          height: 60px;
          border-radius: 10px;
          border: 5px solid ${rahmenFarbe}; /* Hier wird die Farbe von oben eingesetzt */
          object-fit: cover;
        }

        .text-bereich {
          display: flex;
          flex-direction: column;
        }
      </style>

      <ha-card>
        <!-- Das Bild -->
        <img class="profilbild" src="${bildUrl}" alt="Profilbild">
        
        <!-- Der Text daneben -->
        <div class="text-bereich">
          <span style="font-weight: bold; font-size: 16px;">${name}</span>
          <span style="opacity: 0.8; font-size: 12px; text-transform: capitalize;">${status}</span>
        </div>
      </ha-card>
    `;
  }
}

customElements.define('person-details-card', PersonDetailsCard);
