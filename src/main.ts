import * as dm from "instrumentality/dom"
import * as ins from "instrumentality"
import * as lg from "./logic"
const startTime = new ins.Bench()



/**
 * Contains references to important UI elements and functions to manipulate them
 * 
 * @Base - Fundamental functions that serve one fundamental task
 * @Help - Helper functions that simplify other tasks
 * @Comb - Combination of other functions to achieve complex tasks
 */
const UI = {
  // Other
  background_colors: {
    sorting: ["#660000", "#001638"],
    filtering: ["#114538", "#161d23"],
  },

  background_size: "200% 200%",

  appendTextToMain(t_: string): void {
    const p = document.createElement("p")
    p.textContent = t_
    dm.byTag("main").at(0)!.appendChild(p)
  },



  // Sidebar previews
  previews: dm.byTag("aside")[0]!,

  clearPreviews(): void { this.previews.innerHTML = "" },

  insertIntoSidebar(source_: lg.Portrayal): void {
    let element: HTMLImageElement | HTMLVideoElement
    if (source_.type() === "IMAGE")
      element = document.createElement("img")
    else if (source_.type() === "VIDEO") {
      element = document.createElement("video")
      element.muted = true
      element.loop = true
      element.addEventListener("mouseover", () => (element as HTMLVideoElement).play())
      element.addEventListener("mouseout", () => (element as HTMLVideoElement).pause())
    } else
      throw new Error(`Unsupported media type for preview: '${source_.type()}'`)
    element.src = source_.isAt
    element.onclick = () => UI.previewPortrayalOnclickEvent(element)
    element.classList.add("preview") // For styling
    this.previews.appendChild(element) // Add to DOM as HTML element
  },

  // Preview target
  previewTargetID: "preview-target",

  clearPreviewTarget(): void {
    dm.byId(this.previewTargetID, HTMLElement)?.remove()
    for (const paragraph of dm.byTag("p"))
      if (paragraph.id !== "panel-title") // Keep panel title
        paragraph.remove()
  },

  previewPortrayalOnclickEvent(self_: HTMLVideoElement | HTMLImageElement): void {
    dm.byId(UI.previewTargetID, HTMLElement)?.remove()
    let newElement: typeof self_
    if (self_ instanceof HTMLVideoElement) {
      newElement = document.createElement("video")
      newElement.controls = true
      newElement.loop = true
    } else
      newElement = document.createElement("img")
    dm.byTag("main").at(0)!.appendChild(newElement)
    newElement.src = self_.src
    newElement.id = UI.previewTargetID
  },


  // Origin select
  originSelect: dm.byId("origin-select", HTMLInputElement)!,
  originList: dm.byId("origin-list", HTMLDataListElement)!,

  setOriginDatalist(): void {
    for (const origin of lg.listOrigins()) {
      const option = document.createElement("option")
      option.value = origin.name
      option.label = `with ${origin.listAll().length} personas`
      this.originList.appendChild(option)
    }
  },

  setOriginSelectEventHandler(): void {
    UI.originSelect.addEventListener("change", () => this.setPersonaDatalist())
  },


  // Persona select
  personaSelect: dm.byId("persona-select", HTMLInputElement)!,
  personaList: dm.byId("persona-list", HTMLDataListElement)!,

  setPersonaDatalist(): void {
    UI.personaList.innerHTML = "" // Clear previous options
    for (const persona of lg.findOrigin(UI.originSelect.value)?.listAll() ?? []) {
      const option = document.createElement("option")
      option.value = persona.name
      this.personaList.appendChild(option)
    }
  },

  setPersonaSelectEventHandler(): void {
    UI.personaSelect.addEventListener("change", () => {
      const persona = lg.findOrigin(UI.originSelect.value)?.findAny(UI.personaSelect.value) ?? null
      lg.setSelectedPersona(persona)
      if (!persona) {
        alert(`Persona '${UI.personaSelect.value}' doesn't exist`)
        UI.originSelect.value = ""
        UI.personaSelect.value = ""
      }
    })
  },


  // Confirm button
  confirmButton: dm.byId("confirm", HTMLButtonElement)!, // Onclick event is set outside

  // create_new_portrayal_by_user(): void {
  //   const persona = lg.findOrigin(UI.originSelect.value)!.findAny(UI.personaSelect.value)!
  //   const previewElement = dm.byId(UI.previewTargetID, HTMLElement)! as HTMLImageElement | HTMLVideoElement
  //   for (const previewOriginal of dm.byClass("preview", HTMLElement)) {
  //     if (previewOriginal instanceof HTMLImageElement || previewOriginal instanceof HTMLVideoElement)
  //       if (previewOriginal.src === previewElement.src)
  //         previewOriginal.remove()
  //   }
  // },
  // for (const previewOriginal of dm.byClass("preview"))
  //   if (previewOriginal instanceof HTMLImageElement || previewOriginal instanceof HTMLVideoElement)
  //     if (previewOriginal.src === previewElement.src)
  //       previewOriginal.remove()
  // },
//   add_new_persona_filter_by_user(): void {
//     const persona: lg.Persona = lg.findOrigin(UI.originSelect.value)?.findAny(UI.personaSelect.value)!
//     if (!lg.selectedPersonaFilters.includes(persona))
//       lg.selectedPersonaFilters.push(persona)
//     UI.update_sidebar()
//   },

  updateSidebar(): void {
    UI.clearPreviews()
    for (const origin of lg.listOrigins())
      for (const persona of origin.listAll())
        for (const portrayal of persona.listAll())
          UI.insertIntoSidebar(portrayal)
  },

  // setConfirmButtonOnclick(): void {
    // this.confirmButton.onclick = () =>  lg.modeOr() ? this.create_new_portrayal_by_user() : this.add_new_persona_filter_by_user()
  // },


  // Tag buttons
  tagButtons: new Map<lg.TagKey, HTMLButtonElement>(),

  makeCoolColorTagButton(): string {
    return `#${Math.floor(Math.random() * 16777215).toString(16)}`
  },

  tagButtonOnClickHandler(id_: lg.TagKey): void {
    if (lg.selectedTags.has(id_)) {
      lg.selectedTags.delete(id_)
      this.tagButtons.get(id_)!.style.background = ""
    } else {
      lg.selectedTags.add(id_)
      this.tagButtons.get(id_)!.style.backgroundColor = this.makeCoolColorTagButton()
    }
  },

  resetAllTagButtons(): void {
    for (const [_, button] of this.tagButtons.entries())
      button.style.background = ""
    lg.resetTagFilters()
  },

  createTagButtonInDom(id_: lg.TagKey): HTMLButtonElement {
    const button = document.createElement("button")
    button.name = id_
    button.type = "button"
    button.classList.add("tag-button")
    button.textContent = lg.TAGS[id_]
    button.onclick = () => this.tagButtonOnClickHandler(id_)
    return button
  },

  tagsMap: dm.byId("tags-map", HTMLElement)!,

  initAllTagButtons(): void {
    for (const [tagAsChar, _] of Object.entries(lg.TAGS)) {
      const floatingButton = this.createTagButtonInDom(tagAsChar as lg.TagKey)
      this.tagsMap.appendChild(floatingButton)
      this.tagButtons.set(tagAsChar as lg.TagKey, floatingButton)
    }
  },


  // Switch mode button
  switchModeButton: dm.byId("switch-mode", HTMLButtonElement)!, // Onclick event is set outside

  switchBackgroundStyle(): void {
    lg.modeOr() ?
      dm.byTag("body")[0]!.style.background = `linear-gradient(45deg, ${this.background_colors.sorting[0]}, ${this.background_colors.sorting[1]})` :
      dm.byTag("body")[0]!.style.background = `linear-gradient(45deg, ${this.background_colors.filtering[0]}, ${this.background_colors.filtering[1]})`
    dm.byTag("body")[0]!.style.backgroundSize = this.background_size
  },

  setSwitchModeButtonOnClick(): void {
    this.switchModeButton.onclick = () => {
      lg.toggleMode()
      this.switchBackgroundStyle()
      UI.updateSidebar()
      UI.clearPreviewTarget()
    }
  },
} as const


// Init UI stuff
UI.initAllTagButtons()
UI.setOriginDatalist()
UI.setOriginSelectEventHandler()
UI.setPersonaSelectEventHandler()
// UI.set_confirm_button_onclick()
UI.setSwitchModeButtonOnClick()
UI.updateSidebar()
UI.switchBackgroundStyle()

dm.byTag("p").at(1)!.innerHTML = `Initialization took: ${startTime.ms.toFixed(2)} ms`
;(window as any).MODE = lg.mode