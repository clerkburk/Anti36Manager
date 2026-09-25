import * as dm from 'instrumentality/dom'
import * as bs from 'instrumentality'
import * as lg from './logic'
const startTime = new bs.Bench()



/**
 * Contains references to important UI elements and functions to manipulate them
 * 
 * @Base - Fundamental functions that serve one fundamental task
 * @Help - Helper functions that simplify other tasks
 * @Comb - Combination of other functions to achieve complex tasks
 */
const UI = {
  // Other
  backgroundColors: {
    sorting: ['#660000', '#001638'],
    filtering: ['#114538', '#161d23'],
  },

  backgroundSize: '200% 200%',


  // Sidebar previews
  previews: dm.byTag('aside')[0]!,

  appendSidebar(source_: lg.Portrayal): HTMLImageElement | HTMLVideoElement {
    let element: HTMLImageElement | HTMLVideoElement
    if (source_.type === 'IMAGE')
      element = dm.createTag('img')
    else if (source_.type === 'VIDEO') {
      element = dm.createTag('video')
      element.muted = true
      element.loop = true
      element.addEventListener('mouseover', () => (element as HTMLVideoElement).play())
      element.addEventListener('mouseout', () => (element as HTMLVideoElement).pause())
    } else
      throw new Error(`Unsupported media type for preview: '${source_.type}'`)
    element.src = source_.url.href
    element.onclick = () => UI.sidebarOnClick(element, source_.relativePath)
    element.classList.add('preview') // For styling
    UI.previews.appendChild(element) // Add to DOM as HTML element
    return element
  },


  // Preview target
  previewTitle: dm.byId('preview-title', HTMLParagraphElement)!,

  previewTargetID: 'preview-target',

  updatePreviewTitle(): void {
    const selectedElement = dm.byId(UI.previewTargetID, [HTMLMediaElement])
    if (selectedElement)
      UI.previewTitle.innerHTML = `Previewing: ${selectedElement.src}`
    else
      UI.previewTitle.innerHTML = `Current mode: ${lg.mode}`
  },

  sidebarOnClick(self_: HTMLVideoElement | HTMLImageElement): void {
    dm.byId(UI.previewTargetID, [HTMLVideoElement, HTMLImageElement])?.remove()
    let newElement: typeof self_
    if (self_ instanceof HTMLVideoElement) {
      newElement = dm.createTag('video')
      newElement.controls = true
      newElement.loop = true
    } else
      newElement = dm.createTag('img')
    dm.byTag('main').at(0)!.appendChild(newElement)
    newElement.src = self_.src
    newElement.id = UI.previewTargetID
    UI.updatePreviewTitle()
  },

  createNewPortrayalByUser(): void {
    lg.sort(dm.byId(UI.previewTargetID, HTMLElement)!)
  },


  // Origin select
  originSelect: dm.byId('origin-select', HTMLInputElement)!,
  originList: dm.byId('origin-list', HTMLDataListElement)!,

  setOriginDatalist(): void {
    for (const origin of lg.Origin.all()) {
      const option = dm.createTag('option')
      option.value = origin.name
      option.label = `with ${origin.all.length} personas`
      UI.originList.appendChild(option)
    }
  },

  setOriginSelectEventHandler(): void {
    UI.originSelect.addEventListener('change', UI.setPersonaDatalist)
  },


  // Persona select
  personaSelect: dm.byId('persona-select', HTMLInputElement)!,
  personaList: dm.byId('persona-list', HTMLDataListElement)!,

  setPersonaDatalist(): void {
    UI.personaList.innerHTML = '' // Clear previous options
    for (const persona of lg.Origin.any(UI.originSelect.value)?.all ?? []) {
      const option = dm.createTag('option')
      option.value = persona.name
      UI.personaList.appendChild(option)
    }
  },

  setPersonaSelectEventHandler(): void {
    UI.personaSelect.addEventListener('change', () => {
      const persona = lg.Origin.any(UI.originSelect.value)?.any(UI.personaSelect.value) ?? null
      lg.setSelectedPersona(persona)
      if (!persona) {
        alert(`Persona '${UI.personaSelect.value}' doesn't exist`)
        UI.originSelect.value = ''
        UI.personaSelect.value = ''
      }
    })
  },


  // Confirm button
  confirmButton: dm.byId('confirm', HTMLButtonElement)!, // Onclick event is set outside

  updateSidebar(): void {
    UI.previews.innerHTML = ''
    for (const origin of lg.Origin.all())
      for (const persona of origin.all)
        for (const portrayal of persona.all)
          UI.appendSidebar(portrayal)
  },

  setConfirmButtonOnclick(): void {
    UI.confirmButton.onclick = () => lg.modeOr() ?
      UI.createNewPortrayalByUser() :
      (null as any).throw
      // UI.add_new_persona_filter_by_user()
  },


  // Tag buttons
  tagButtons: new Map<lg.TagKey, HTMLButtonElement>(),

  makeCoolColorTagButton(): string {
    return `#${Math.floor(Math.random() * 16777215).toString(16)}`
  },

  tagButtonOnClickHandler(id_: lg.TagKey): void {
    if (lg.selectedTags.has(id_)) {
      lg.selectedTags.delete(id_)
      UI.tagButtons.get(id_)!.style.background = ''
    } else {
      lg.selectedTags.add(id_)
      UI.tagButtons.get(id_)!.style.backgroundColor = UI.makeCoolColorTagButton()
    }
  },

  resetAllTagButtons(): void {
    for (const [_, button] of UI.tagButtons.entries())
      button.style.background = ''
    lg.resetTagFilters()
  },

  createTagButtonInDom(id_: lg.TagKey): HTMLButtonElement {
    const button = document.createElement('button')
    button.name = id_
    button.type = 'button'
    button.classList.add('tag-button')
    button.textContent = lg.TAGS[id_]
    button.onclick = () => UI.tagButtonOnClickHandler(id_)
    return button
  },

  tagsMap: dm.byId('tags-map', HTMLElement)!,

  initAllTagButtons(): void {
    for (const [tagAsChar, _] of Object.entries(lg.TAGS)) {
      const floatingButton = UI.createTagButtonInDom(tagAsChar as lg.TagKey)
      UI.tagsMap.appendChild(floatingButton)
      UI.tagButtons.set(tagAsChar as lg.TagKey, floatingButton)
    }
  },


  // Switch mode button
  switchModeButton: dm.byId('switch-mode', HTMLButtonElement)!, // Onclick event is set outside

  switchBackgroundStyle(): void {
    lg.modeOr() ?
      dm.byTag('body')[0]!.style.background = `linear-gradient(45deg, ${UI.backgroundColors.sorting[0]}, ${UI.backgroundColors.sorting[1]})` :
      dm.byTag('body')[0]!.style.background = `linear-gradient(45deg, ${UI.backgroundColors.filtering[0]}, ${UI.backgroundColors.filtering[1]})`
    dm.byTag('body')[0]!.style.backgroundSize = UI.backgroundSize
  },

  setSwitchModeButtonOnClick(): void {
    UI.switchModeButton.onclick = () => {
      lg.toggleMode()
      UI.switchBackgroundStyle()
      UI.updateSidebar()
      dm.byId(UI.previewTargetID, HTMLElement)?.remove()
      UI.previewTitle.innerHTML = `Current mode: ${lg.mode}`
    }
  },
} as const


// Init UI stuff
UI.initAllTagButtons()
UI.setOriginDatalist()
UI.setOriginSelectEventHandler()
UI.setPersonaSelectEventHandler()
UI.setConfirmButtonOnclick()
UI.setSwitchModeButtonOnClick()
UI.updateSidebar()
UI.switchBackgroundStyle()

UI.previewTitle.innerHTML = `Initialization took: ${startTime.ms.toFixed(2)} ms`
;(window as any).MODE = lg.mode