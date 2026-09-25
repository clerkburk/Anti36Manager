/*
  Contains the logic for managing media files
  Note:
    For consistency, don't use Web/DOM-related code here
*/
/// <reference types="node" />
import * as rd from "instrumentality/road"
import * as bs from "instrumentality"
import * as url from "node:url"



// Lookups and Constants
export class Err extends bs.Err { override name = "Anti36-Logic-Error" }
import A36M_CONFIGS from "M:/a36s.ts" // Placeholder
export const GALLERY = rd.dir(A36M_CONFIGS.galleryFolder, true)
export const EXT2MEDIA = A36M_CONFIGS.ext2Media
export const TAGS = A36M_CONFIGS.tags
export type TagKey = keyof typeof TAGS
export type TagDescription = typeof TAGS[TagKey]
export function reverseTAGS(description_: TagDescription | string): TagKey | null {
  for (const [key, value] of Object.entries(TAGS))
    if (value === description_)
      return key as keyof typeof TAGS
  return null
}



// Helpers
export const selectedTags: Set<TagKey> = new Set()

export function resetTagFilters(filterSpecific_?: (tag_:TagKey)=>boolean): void {
  if (!filterSpecific_)
    selectedTags.clear()
  else
    for (const tag of [...selectedTags])
      if (!filterSpecific_(tag))
        selectedTags.delete(tag)
}


export let mode: 'sort' | 'filter' = "sort"
export function modeOr(): boolean { return mode === 'sort' }
export function toggleMode(to_?: typeof mode): void {
  if (to_)
    mode = to_
  else
    mode = mode === "sort" ? "filter" : "sort"
}


export let selectedPersona: Persona | null = null
export function resetSelectedPersona(): void { selectedPersona = null }
export function setSelectedPersona(persona_: Persona | null): void { selectedPersona = persona_ }



export let selectedPortrayal: Portrayal | null = null
export function resetSelectedPortrayal(): void { selectedPortrayal = null }
export function setSelectedPortrayal(portrayal_: Portrayal | null): void { selectedPortrayal = portrayal_ }



export class Origin extends rd.Dir {
  static all(): Origin[] { return GALLERY.listSync(r=>r.isDir()).map(d => origin(d)) }
  static any(name_: string): Origin | null {
    return GALLERY.listSync(r=>r.isDir()).map(d => origin(d)).find(d => d.name === name_) ?? null
  }
  override readonly writable = false as const
  override readonly moveable = false as const
  override readonly deletable = false as const
  override readonly copyable = false as const
  override readonly renameable = false as const
  get url(): url.URL { return url.pathToFileURL(this.isAt) }
  get all(): Persona[] { return super.listSync(r=>r.isDir()).map(d => persona(d)) }
  any(name_: string): Persona | null {
    const dir = super.findSync(name_, r=>r.isDir())
    return dir ? persona(dir) : null
  }
}
export function origin(path_: string | rd.Dir): Origin { return new Origin(path_.toString(), true) }


export class Persona extends rd.Dir {
  override readonly writable = false as const
  override readonly moveable = false as const
  override readonly deletable = false as const
  override readonly copyable = false as const
  override readonly renameable = false as const
  get from(): Origin { return origin(this.parent()) }
  get url(): url.URL { return url.pathToFileURL(this.isAt) }
  get all(): Portrayal[] { return super.listSync(r=>r.isFile()).map(f => portrayal(f)) }
  get allValid(): Portrayal[] { return this.all.filter(p=>p.valid) }
  get allInvalid(): Portrayal[] { return this.all.filter(p=>!p.valid) }
  any(name_: string): Portrayal | null {
    const file = super.findSync(name_, r=>r.isFile())
    return file ? portrayal(file) : null
  }
  valid(name_: string): Portrayal | null {
    const p = this.any(name_)
    return p && p.valid ? p : null
  }
  invalid(name_: string): Portrayal | null {
    const p = this.any(name_)
    return p && !p.valid ? p : null
  }
}
export function persona(path_: string | rd.Dir): Persona { return new Persona(path_.toString(), true) }


export const PORTRAYAL_REGEX = /^@(\d+)((?:#[a-zA-Z0-9_-]+)*)\.([a-zA-Z0-9]+)$/ // Expected: @<id:number>#<t1:string>#<t2:string>#<...>.<extension:string>

export class Portrayal extends rd.File {
  override readonly writable = false as const
  override readonly moveable = false as const
  override readonly deletable = false as const
  override readonly copyable = false as const
  override readonly renameable = true as const

  get from(): Persona { return persona(this.parent()) }
  get valid(): boolean { return PORTRAYAL_REGEX.test(this.name) }
  get breakdown() {
    const match = this.name.match(PORTRAYAL_REGEX)!
    const id = Number(match[1])
    const tags = match[2] ? match[2].slice(1).split('#') : []
    return { id, tags } // extension is already provided as method in rd.File
  }
  get url(): url.URL {
    return url.pathToFileURL(this.isAt)
  }
  get id(): number { return Number(this.breakdown.id) }
  get tagDescriptions(): TagDescription[] { return this.breakdown.tags.map(tk => {
    const t = TAGS[tk as TagKey]
    if (!t) throw new Err(`Invalid tag key: ${tk}`)
    return t
  }) }
  get tagKeys(): TagKey[] { return this.breakdown.tags.map(tk => {
    if (!(tk in TAGS)) throw new Err(`Invalid tag key: ${tk}`)
    return tk as TagKey
  }) }
  get type(): typeof EXT2MEDIA[keyof typeof EXT2MEDIA] { return EXT2MEDIA[this.ext.toLowerCase() as keyof typeof EXT2MEDIA] }
  get relativePath(): string {
    return this.from.from.name + "/" + this.from.name + "/" + this.name
  }
}
export function portrayal(path_: string | rd.File): Portrayal {
  const path = path_.toString().startsWith("file:///") ? decodeURI(path_.toString().substring("file:///".length)) : path_.toString()
  return new Portrayal(path, true)
}



export function nextOpenId(inside_: Persona): number {
  let nextId = 0
  const existingIds = inside_.all.filter(f => f.valid).map(f => f.id)
  while (existingIds.includes(nextId)) nextId++
  return nextId
}



export function sort(grabFrom_: HTMLElement) {
  const grabFrom = portrayal((grabFrom_ as any).src)
  const inside = selectedPersona ?? grabFrom.from
  const newName = `@${nextOpenId(inside)}${[...selectedTags].map(tk => `#${tk}`).join('')}${grabFrom.ext}`
  grabFrom.renameSync(newName)
  return portrayal(grabFrom.isAt)
}