/*
  Contains the logic for managing media files
  Note:
    For consistency, don't use Web/DOM-related code here
*/
import * as rd from "instrumentality/road"



// Lookups and Constants {
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

export function resetTagFilters(filterSpecific?: (tag_:TagKey)=>boolean): void {
  if (!filterSpecific)
    selectedTags.clear()
  else
    for (const tag of [...selectedTags])
      if (!filterSpecific(tag))
        selectedTags.delete(tag)
}


export let mode: "view" | "sort" = "view"
export function modeOr(): boolean { return mode === 'view' }
export function toggleMode(to_?: "view" | "sort"): void {
  if (to_)
    mode = to_
  else
    mode = mode === "view" ? "sort" : "view"
}


export let selectedPersona: Persona | null = null
export function resetSelectedPersona(): void { selectedPersona = null }
export function setSelectedPersona(persona_: Persona | null): void { selectedPersona = persona_ }


export function listOrigins(): Origin[] { return GALLERY.listSync(r=>r.isDir()).map(d => new Origin(d.name)) }
export function findOrigin(name_: string): Origin | null {
  const dir = GALLERY.listSync(r=>r.isDir()).find(dir => dir.name === name_)
  return dir ? new Origin(dir.name) : null
}


export class Origin extends rd.Dir {
  override readonly writable = false as const
  override readonly moveable = false as const
  override readonly deletable = false as const
  override readonly copyable = false as const
  override readonly renameable = false as const
  constructor(name_: string) { super(GALLERY.join(name_), true) }

  listAll(): Persona[] { return super.listSync(r=>r.isDir()).map(dir => new Persona(this, dir.name)) }
  findAny(name_: string): Persona | null {
    const dir = super.findSync(name_, r=>r.isDir())
    return dir ? new Persona(this, dir.name) : null
  }
}


export class Persona extends rd.Dir {
  override readonly writable = false as const
  override readonly moveable = false as const
  override readonly deletable = false as const
  override readonly copyable = false as const
  override readonly renameable = false as const
  constructor(inside_: Origin, name_: string) { super(inside_.join(name_), true) }

  from(): Origin { return new Origin(this.parent().name) }
  listAll(): Portrayal[] { return super.listSync(r=>r.isFile()).map(file => new Portrayal(this, file.name)) }
  listValid(): Portrayal[] { return this.listAll().filter(p=>p.valid()) }
  listUnvalid(): Portrayal[] { return this.listAll().filter(p=>!p.valid()) }
  findAny(name_: string): Portrayal | null {
    const file = super.findSync(name_, r=>r.isFile())
    return file ? new Portrayal(this, file.name) : null
  }
  findValid(name_: string): Portrayal | null {
    const p = this.findAny(name_)
    return p && p.valid() ? p : null
  }
  findUnvalid(name_: string): Portrayal | null {
    const p = this.findAny(name_)
    return p && !p.valid() ? p : null
  }
}


export const PORTRAYAL_REGEX = /^@(\d+)((?:#[a-zA-Z0-9_-]+)*)\.([a-zA-Z0-9]+)$/ // Expected: @<id:number>#<t1:string>#<t2:string>#<...>.<extension:string>

export class Portrayal extends rd.File {
  override readonly writable = false as const
  override readonly moveable = false as const
  override readonly deletable = false as const
  override readonly copyable = false as const
  override readonly renameable = false as const
  constructor(inside_: Persona, name_: string) {
    super(inside_.join(name_), false)
  }

  valid(): boolean { return PORTRAYAL_REGEX.test(this.name) }
  breakdown() {
    const match = this.name.match(PORTRAYAL_REGEX)!
    const id = Number(match[1])
    const tags = match[2] ? match[2].slice(1).split('#') : []
    return { id, tags } // extension is already provided as method in rd.File
  }
  id(): number { return Number(this.breakdown().id) }
  tagDescriptions(): TagDescription[] { return this.breakdown().tags.map(tk => {
    const t = TAGS[tk as TagKey]
    if (!t) throw new Error(`Invalid tag key: ${tk}`)
    return t
  }) }
  tagKeys(): TagKey[] { return this.breakdown().tags.map(tk => {
    if (!(tk in TAGS)) throw new Error(`Invalid tag key: ${tk}`)
    return tk as TagKey
  }) }
  type(): typeof EXT2MEDIA[keyof typeof EXT2MEDIA] { return EXT2MEDIA[this.ext.toLowerCase() as keyof typeof EXT2MEDIA] }
}



export async function sort(grabFrom_: rd.File, inside_: Persona): Promise<Portrayal> {
  grabFrom_.move(rd.tmp())
  grabFrom_.rename(`@${inside_.listAll().length + 1}${[...selectedTags].map(tk => `#${tk}`).join('')}.${grabFrom_.ext}`)
  grabFrom_.move(inside_)
  return new Portrayal(inside_, grabFrom_.name)
}
export function sortSync(grabFrom_: rd.File, inside_: Persona): Portrayal {
  grabFrom_.moveSync(rd.tmp())
  grabFrom_.renameSync(`@${inside_.listAll().length + 1}${[...selectedTags].map(tk => `#${tk}`).join('')}.${grabFrom_.ext}`)
  grabFrom_.moveSync(inside_)
  return new Portrayal(inside_, grabFrom_.name)
}