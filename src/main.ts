const timeStart = performance.now()
import * as isn from "ts-instrumentality/node"
import * as isd from "ts-instrumentality/dom"
import * as bn from "./logic.js"


// Reset portrayals back to unsorted (DEBUGGING ONLY)
bn.all_portrayals().forEach(portrayal => portrayal.move_sync(bn.UNSORTED_FOLDER))



// Handle UI elements
const UI = {
  /*
    Contains references to important UI elements and
    functions to manipulate them.
  */
  // Other
  background_colors: {
    sorting: ["#660000", "#001638"],
    filtering: ["#114538", "#161d23"],
  },
  background_size: "200% 200%",

  // Previews (sidebar)
  previews: isd.by_tag("aside")[0]!,

  clear_previews(): void {
    for (const child of Array.from(this.previews.children))
      if (child.className !== "panel-title") // Keep title
        child.remove()
  },

  add_text_to_sidebar(_text: string): void {
    const paragraph = document.createElement("p")
    paragraph.textContent = _text
    this.previews.appendChild(paragraph)
  },

  insert_into_sidebar(_source: isn.File): HTMLImageElement | HTMLVideoElement {
    /*
      Inserts a media file into the sidebar as an
      img or vid element.
    */
    let element: HTMLImageElement | HTMLVideoElement
    if (bn.EXTENSION_TO_MEDIA[_source.ext()] === bn.MediaT.IMAGE)
      element = document.createElement("img")
    else if (bn.EXTENSION_TO_MEDIA[_source.ext()] === bn.MediaT.VIDEO) {
      element = document.createElement("video")
      element.muted = true
      element.loop = true
      element.addEventListener("mouseover", () => (element as HTMLVideoElement).play())
      element.addEventListener("mouseout", () => (element as HTMLVideoElement).pause())
    }
    else
      throw new Error(`Unsupported media type for preview: '${_source.ext()}'`)
    element.src = _source.isAt
    element.onclick = () => UI.preview_portrayal_onclick_event(element)
    element.classList.add("preview") // For styling
    UI.previews.appendChild(element) // Add to DOM as HTML element
    return element
  },

  update_sidebar(): void {
    /*
      Clears and repopulates the sidebar with stuff depending
      on current filtering/sorting settings.
    */
    const title = isd.by_class("panel-title", HTMLElement).at(1)!
    title.textContent = "Updating..."
    this.clear_previews()
    let mediaToShow: isn.File[] = bn.mode_or() ?
      bn.list_all_unsorted_portrayals() :
      bn.make_portrayal_bundle(bn.all_portrayals(), { byPersonas: bn.selectedPersonaFilters, byTags: bn.selectedTags })
      
    console.debug("Updating sidebar with portrayals: ", mediaToShow)
    for (const media of mediaToShow)
      this.insert_into_sidebar(new isn.File(media.isAt))
    if (bn.currentMode === bn.Mode.FILTERING) {
      title.textContent = "Filter info"
      for (const tag of bn.selectedTags)
        this.add_text_to_sidebar(`Tag filter: ${bn.TAGS[tag]}`)
      for (const persona of bn.selectedPersonaFilters)
        this.add_text_to_sidebar(`Persona filter: ${persona.name()} from ${persona.from().name()}`)
    } else
      title.textContent = "Sorting mode"
  },


  // Preview target
  previewTargetID: "preview-target", // Can't be obj cuz it takes different shapes at runtime

  clear_preview_target(): void {
    isd.by_id(UI.previewTargetID, HTMLElement).innerHTML = ""
  },

  preview_portrayal_onclick_event(_selfHtml: HTMLVideoElement | HTMLImageElement): void {
    /*
      Remove previous preview target and replace with own
    */
    this.clear_preview_target()
    let newElement: typeof _selfHtml
    if (_selfHtml instanceof HTMLVideoElement) {
      newElement = document.createElement("video")
      newElement.controls = true
      newElement.loop = true
    }
    else
      newElement = document.createElement("img")
    isd.by_tag("main").at(0)!.appendChild(newElement)
    newElement.src = _selfHtml.src
    newElement.id = UI.previewTargetID
  },


  // Origin select 
  originSelect: isd.by_id("origin-select", HTMLInputElement),
  originList: isd.by_id("origin-list", HTMLDataListElement),

  set_origin_datalist(): void {
    for (const origin of bn.list_origins()) {
      const option = document.createElement("option")
      option.value = origin.name()
      option.label = `with ${origin.list_personas().length} personas`
      this.originList.appendChild(option)
    }
  },

  set_originSelect_event_handler(): void {
    UI.originSelect.addEventListener("change", () => this.set_persona_datalist())
  },


  // Persona select
  personaSelect: isd.by_id("persona-select", HTMLInputElement),
  personaList: isd.by_id("persona-list", HTMLDataListElement),

  set_persona_datalist(): void {
    /*
      Sets the persona datalist according to the origin
      input field's value.
    */
    UI.personaList.innerHTML = "" // Clear previous options
    for (const persona of bn.find_origin(UI.originSelect.value)?.list_personas() ?? []) {
      const option = document.createElement("option")
      option.value = persona.name()
      this.personaList.appendChild(option)
    }
  },

  set_personaSelect_event_handler(): void {
    UI.personaSelect.addEventListener("change", () => {
      if (!bn.find_origin(UI.originSelect.value)?.find_persona(UI.personaSelect.value)) {
        alert(`Persona '${UI.personaSelect.value}' doesn't exist`)
        UI.originSelect.value = ""
        UI.personaSelect.value = ""
      }
    })
  },


  // Confirm button
  confirmButton: isd.by_id("confirm", HTMLButtonElement), // Onclick event is set outside

  async create_new_portrayal_by_user(): Promise<void> {
    const persona: bn.Persona = bn.find_origin(UI.originSelect.value)?.find_persona(UI.personaSelect.value)!
    const previewElement = document.getElementById(UI.previewTargetID)! as HTMLImageElement | HTMLVideoElement
    console.debug("DEBUG: ", bn.create_portrayal(persona, bn.selectedTags, new isn.File(decodeURI(previewElement.src.replace(/^file:\/\/\//, "")))))
    for (const previewOriginal of isd.by_class("preview"))
      if (previewOriginal instanceof HTMLImageElement || previewOriginal instanceof HTMLVideoElement)
        if (previewOriginal.src === previewElement.src)
          previewOriginal.remove()
  },
  add_new_persona_filter_by_user(): void {
    const persona: bn.Persona = bn.find_origin(UI.originSelect.value)?.find_persona(UI.personaSelect.value)!
    if (!bn.selectedPersonaFilters.includes(persona))
      bn.selectedPersonaFilters.push(persona)
    UI.update_sidebar()
  },

  update_list(): void {
    /*
      Apply filtering according to selected personas and tags
    */
    // Clear sidebar
    UI.clear_previews()
    // Gather portrayals to show
    let portrayalsToShow: bn.Portrayal[] = bn.make_portrayal_bundle(bn.all_portrayals(), { byPersonas: bn.selectedPersonaFilters, byTags: bn.selectedTags })
    console.debug("Filtered portrayals: ", portrayalsToShow)
    // Insert into sidebar
    for (const portrayal of portrayalsToShow)
      UI.insert_into_sidebar(new isn.File(portrayal.isAt))
  },

  set_confirm_button_onclick(): void {
    this.confirmButton.onclick = () =>  bn.mode_or() ? this.create_new_portrayal_by_user() : this.add_new_persona_filter_by_user()
  },


  // Tag buttons
  tagButtons: new Map<bn.TagT, HTMLButtonElement>(),

  make_cool_color_tag_button(): string {
    return `#${Math.floor(Math.random() * 16777215).toString(16)}`
  },

  tag_button_onClick_handler(_identifier: bn.TagT): void {
    /*
      Target function for when a tag button is clicked. If
      the tag is already selected, it will unselect itself
      and vice versa.
      Note:
        This function should be called by an event listener
    */
    if (bn.selectedTags.includes(_identifier)) {
      bn.reset_tag_filters(bn.selectedTags.filter((tag) => tag !== _identifier)) // Unselect
      this.tagButtons.get(_identifier)!.style.background = ""
    }
    else {
      bn.selectedTags.push(_identifier) // Select
      this.tagButtons.get(_identifier)!.style.backgroundColor = this.make_cool_color_tag_button()
    }
    UI.update_sidebar()
  },

  create_tag_button_in_dom(_identifier: bn.TagT): HTMLButtonElement {
    /*
      Create and insert a tag button inside DOM
    */
    const button = document.createElement("button")
    button.name = _identifier
    button.type = "button"
    button.classList.add("tag-button")
    button.textContent = bn.TAGS[_identifier]
    button.onclick = () => this.tag_button_onClick_handler(_identifier)
    return button
  },

  init_all_tag_buttons(): void {
    for (const [tagAsChar, _] of Object.entries(bn.TAGS)) {
      const floatingButton = this.create_tag_button_in_dom(tagAsChar as bn.TagT)
      isd.by_id("tags-map", HTMLElement).appendChild(floatingButton)
      this.tagButtons.set(tagAsChar as bn.TagT, floatingButton)
    }
  },


  // Switch mode button
  switchModeButton: isd.by_id("switch-mode", HTMLButtonElement), // Onclick event is set outside

  switch_background_style(): void {
    if (bn.mode_or())
      isd.by_tag("body").at(0)!.style.background = `linear-gradient(45deg, ${this.background_colors.sorting[0]}, ${this.background_colors.sorting[1]})`
    else
      isd.by_tag("body").at(0)!.style.background = `linear-gradient(45deg, ${this.background_colors.filtering[0]}, ${this.background_colors.filtering[1]})`
    isd.by_tag("body").at(0)!.style.backgroundSize = this.background_size
  },

  set_switch_mode_button_onclick(): void {
    this.switchModeButton.onclick = () => {
      bn.toggleMode()
      console.debug("Switched mode to ", bn.currentMode)
      this.switch_background_style()
      UI.update_sidebar()
      UI.clear_preview_target()
    }
  },
} as const


// Init UI stuff
UI.init_all_tag_buttons()
UI.set_origin_datalist()
UI.set_originSelect_event_handler()
UI.set_personaSelect_event_handler()
UI.set_confirm_button_onclick()
UI.set_switch_mode_button_onclick()
UI.update_sidebar()

isd.by_id(UI.previewTargetID).innerHTML = `Took: ${String(performance.now() - timeStart).slice(0, 5)} ms`
;(window as any).UI = UI // For debugging
;(window as any).bn = bn // For debugging