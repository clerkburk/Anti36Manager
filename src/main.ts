const timeStart = performance.now()
import * as isn from "ts-instrumentality/node"
import * as isd from "ts-instrumentality/dom"
import * as bn from "./logic.js"


// Reset portrayals back to unsorted (DEBUGGING ONLY)
bn.all_portrayals().forEach(portrayal => portrayal.move_sync(bn.UNSORTED_FOLDER))



// Resources (here for mutability)
export let isSortingMode = true // true: sorting mode, false: filtering mode
export let selectedPersonaFilters: bn.Persona[] = []
export let selectedTags: bn.TagT[] = []



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


  // Preview target
  previewTargetID: "preview-target", // Can't be obj cuz it takes different shapes at runtime

  preview_portrayal_onclick_event(_selfHtml: HTMLVideoElement | HTMLImageElement): void {
    /*
      Remove previous preview target and replace with own
    */
    isd.by_id(UI.previewTargetID, HTMLElement).remove()
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
    console.debug("DEBUG: ", bn.create_portrayal(persona, selectedTags, new isn.File(decodeURI(previewElement.src.replace(/^file:\/\/\//, "")))))
    for (const previewOriginal of isd.by_class("preview"))
      if (previewOriginal instanceof HTMLImageElement || previewOriginal instanceof HTMLVideoElement)
        if (previewOriginal.src === previewElement.src)
          previewOriginal.remove()
  },

  confirm_filtering(): void {
    /*
      Apply filtering according to selected personas and tags
    */
    // Clear sidebar
    UI.previews.innerHTML = ""
    // Gather portrayals to show
    let portrayalsToShow: bn.Portrayal[] = bn.make_portrayal_bundle(bn.all_portrayals(), { byPersonas: selectedPersonaFilters, byTags: selectedTags })
    console.debug("Filtered portrayals: ", portrayalsToShow)
    // Insert into sidebar
    for (const portrayal of portrayalsToShow)
      UI.insert_into_sidebar(new isn.File(portrayal.isAt))
  },

  set_confirm_button_onclick(): void {
    this.confirmButton.onclick = () => {
      if (isSortingMode)
        this.create_new_portrayal_by_user()
      else
        this.confirm_filtering()
    }
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
    if (selectedTags.includes(_identifier)) {
      selectedTags = selectedTags.filter((tag) => tag !== _identifier) // Unselect
      this.tagButtons.get(_identifier)!.style.background = ""
    }
    else {
      selectedTags.push(_identifier) // Select
      this.tagButtons.get(_identifier)!.style.backgroundColor = this.make_cool_color_tag_button()
    }
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

  set_switch_mode_button_onclick(): void {
    this.switchModeButton.onclick = () => {
      isSortingMode = !isSortingMode
      console.debug("Switched mode to ", isSortingMode ? "Sorting" : "Filtering")
      if (isSortingMode) {
        isd.by_tag("body").at(0)!.style.background = `linear-gradient(45deg, ${this.background_colors.sorting[0]}, ${this.background_colors.sorting[1]})`
        isd.by_tag("body").at(0)!.style.backgroundSize = this.background_size
      } else {
        isd.by_tag("body").at(0)!.style.background = `linear-gradient(45deg, ${this.background_colors.filtering[0]}, ${this.background_colors.filtering[1]})`
        isd.by_tag("body").at(0)!.style.backgroundSize = this.background_size
      }
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

for (const media of bn.UNSORTED_FOLDER.list_sync())
  UI.insert_into_sidebar(new isn.File(media.isAt))

isd.by_id(UI.previewTargetID).innerHTML = `Took: ${String(performance.now() - timeStart).slice(0, 5)} ms`
console.debug("test")