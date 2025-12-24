const timeStart = performance.now()
import * as isn from "ts-instrumentality/node"
import * as isd from "ts-instrumentality/dom"
import * as isb from "ts-instrumentality/base"
import * as bn from "./logic.js"
import * as cr from "node:crypto"
import * as ph from "node:path"


// Reset portrayals back to unsorted (DEBUGGING ONLY)
bn.all_portrayals().forEach(portrayal => portrayal.move_sync(bn.UNSORTED_FOLDER))

// Create random origins and personas (DEBUGGING ONLY)
for (const road of bn.GALLERY_FOLDER.list_sync(isn.Folder)) // Clear existing origins
  road.delete_sync()
const DEBUG_MAX_ORIGIN_AMOUNT = 2 as const
const DEBUG_MAX_PERSONA_AMOUNT = 2 as const
const DEBUG_MIN_ORIGIN_AMOUNT = 1 as const
const DEBUG_MIN_PERSONA_AMOUNT = 1 as const
for (let _ in isb.range(cr.randomInt(DEBUG_MIN_ORIGIN_AMOUNT, DEBUG_MAX_ORIGIN_AMOUNT))) { // Create origins
  const originFolder = isn.Folder.create_sync(ph.join(bn.GALLERY_FOLDER.isAt, `og_${cr.randomUUID().slice(0, 4)}`))
  for (let __ in isb.range(cr.randomInt(DEBUG_MIN_PERSONA_AMOUNT, DEBUG_MAX_PERSONA_AMOUNT))) // Create personas
    isn.Folder.create_sync(ph.join(originFolder.isAt, `ps_${cr.randomUUID().slice(0, 4)}`))
}
console.log("DEBUG: Created random origins and personas")



// Handle UI elements
const UI = {
  /*
    Contains references to important UI elements and
    functions to manipulate them.
    Fyi:
      Base = Fundamental functions that serve one fundamental task
      Help = Helper functions that simplify other tasks
      Comb = Combination of other functions to achieve complex tasks
      Should help with organization, removed later at release
  */
  // Other
  /**
   * @for body
   * @summary Background colors for different modes
   * @description Different background color gradients for sorting and filtering modes
   */
  background_colors: {
    sorting: ["#660000", "#001638"],
    filtering: ["#114538", "#161d23"],
  },
  /**
   * @for body
   * @summary Background size for gradient
   * @description CSS background-size property value for body background
   */
  background_size: "200% 200%",

  /**
   * @as Base
   * @for main
   * @param _text Text to append
   * @summary Appends text at the bottom of main
   * @description Creates a new paragraph element with the given text and appends it to the main element
   */
  append_text_to_main(_text: string): void {
    const p = document.createElement("p")
    p.textContent = _text
    isd.by_tag("main").at(0)!.appendChild(p)
  },



  // Sidebar previews
  /**
   * @for aside
   * @summary Sidebar previews container
   * @description The HTML aside element that contains all media previews
   */
  previews: isd.by_tag("aside")[0]!,

  /**
   * @as Base
   * @for aside
   * @summary Clears all previews from the sidebar
   * @description Removes all child elements from the sidebar previews container
   */
  clear_previews(): void {
    for (const child of Array.from(this.previews.children))
      child.remove()
  },

  /**
   * @as Comb
   * @for aside
   * @summary Inserts a media preview into the sidebar
   * @description Makes an html element for the given media source and inserts it into the sidebar
   * @param _source Media source file
   * @returns The created HTML element
   */
  insert_into_sidebar(_source: isn.File): HTMLImageElement | HTMLVideoElement {
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

  /**
   * @as Comb
   * @for aside
   * @summary Updates the sidebar previews
   * @description Clears and repopulates the sidebar with stuff depending on current filtering/sorting settings.
   */
  update_sidebar(): void {
    /*
      Clears and repopulates the sidebar with stuff depending
      on current filtering/sorting settings.
    */
    this.clear_previews()
    let mediaToShow: isn.File[] = bn.mode_or() ?
      bn.list_all_unsorted_portrayals() :
      bn.make_portrayal_bundle(bn.all_portrayals(), { byPersonas: bn.selectedPersonaFilters, byTags: bn.selectedTags })

    console.debug("Updating sidebar with portrayals: ", mediaToShow)
    for (const media of mediaToShow)
      this.insert_into_sidebar(new isn.File(media.isAt))
  },


  // Preview target
  /**
   * @for main below
   * @summary ID of the preview target element
   * @description The element in main that shows the selected preview from sidebar
   * @note Not typed as HTMLElement because type varies at runtime
   */
  previewTargetID: "preview-target",

  /**
   * @as Base
   * @for main below
   * @summary Clears the preview target element from main
   * @description Clears the preview target element from main except for the panel title obviously
   */
  clear_preview_target(): void {
    document.getElementById(this.previewTargetID)?.remove()
    for (const paragraph of isd.by_tag("p"))
      if (paragraph.id !== "panel-title") // Keep panel title
        paragraph.remove()
  },

  /**
   * @as Comb
   * @for aside (copies self to main below)
   * @summary Event handler for when a preview in the sidebar is clicked
   * @description Removes previous preview target element and creates a new one
   * @param _selfHtml The HTML element that was clicked
   */
  preview_portrayal_onclick_event(_selfHtml: HTMLVideoElement | HTMLImageElement): void {
    document.getElementById(UI.previewTargetID)?.remove()
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
  /**
   * @for origin select
   * @summary Origin select input element
   * @description The HTML input element for selecting origins
   */
  originSelect: isd.by_id("origin-select", HTMLInputElement),
  /**
   * @for origin select
   * @summary Origin datalist element
   * @description The HTML datalist element that contains all origin options
   */
  originList: isd.by_id("origin-list", HTMLDataListElement),

  /**
   * @as Base
   * @for origin select
   * @summary Populates the origin datalist with available origins
   * @description Creates option elements for each available origin and appends them to the origin datalist
   */
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

  reset_all_tag_buttons(): void {
    for (const [_, button] of this.tagButtons.entries())
      button.style.background = ""
    bn.reset_tag_filters([])
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

isd.by_tag("p").at(1)!.innerHTML = `Initialization took: ${String(performance.now() - timeStart).slice(0, 5)} ms`
;(window as any).UI = UI // For debugging
;(window as any).bn = bn // For debugging