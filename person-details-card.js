// 1. Wir erfinden einen neuen HTML-Baustein
class PersonDetailsCard extends HTMLElement {
  
  // 2. Das wird ausgeführt, wenn die Karte ins Dashboard gezogen wird
  constructor() {
    super();
    // Wir bauen eine Art unsichtbaren Zaun, damit unser Design nicht das restliche Home Assistant kaputt macht
    this.attachShadow({ mode: 'open' }); 
  }

  // 3. Hier kommt alles an, was der Nutzer im Dashboard einstellt (z.B. welche Person)
  setConfig(config) {
    if (!config.entity) {
      // Wenn der Nutzer vergisst, eine Person anzugeben, meckern wir:
      throw new Error("Bitte gib eine Entität (Person) an!");
    }
    this.config = config;
  }

  // 4. Das ist das Herzstück: Das wird JEDES MAL aufgerufen, wenn sich im Smart Home was ändert (z.B. Akkustand sinkt)
  set hass(hass) {
    // Hier sagen wir der Karte, wie sie aussehen soll.
    // Vorerst machen wir nur eine ganz simple Box zum Testen.
    this.shadowRoot.innerHTML = `
      
        
          Hallo Welt! 👋
          Das ist die Karte für: ${this.config.entity}
        
      
    `;
  }
}

// 5. Hier sagen wir Home Assistant: "Hey, wenn jemand 'custom:person-details-card' tippt, nimm diesen Code!"
customElements.define('person-details-card', PersonDetailsCard);
