/*
  Contains the logic for managing media files
  Note:
    For consistency, don't use Web/DOM-related code here
*/
import * as isn from "ts-instrumentality/node"
import { join } from "node:path"




// Lookups and Constants
import A36M_CONFIGS from "../../a36s.json" with { type: "json" } // Placeholder
export const GALLERY_FOLDER = new isn.Folder(A36M_CONFIGS.galleryFolder)
export const UNSORTED_FOLDER = new isn.Folder(A36M_CONFIGS.unsortedFolder)
export const TAGS = A36M_CONFIGS.tags
export type TagT = keyof typeof TAGS
export function to_TagT(_keyAsStr: string): TagT {
  if (_keyAsStr in TAGS)
    return _keyAsStr as TagT
  throw new Error(`Invalid tag key: ${_keyAsStr}`)
}



// Type management
export const enum MediaT {
  IMAGE = "IMAGE",
  VIDEO = "VIDEO"
}
export const EXTENSION_TO_MEDIA: { [ext: string]: MediaT } = { // Lowercase before use
  ".mp4": MediaT.VIDEO,
  ".webm": MediaT.VIDEO,
  ".mkv": MediaT.VIDEO,
  ".avi": MediaT.VIDEO,
  ".mov": MediaT.VIDEO,
  ".jpg": MediaT.IMAGE,
  ".jpeg": MediaT.IMAGE,
  ".png": MediaT.IMAGE,
  ".gif": MediaT.IMAGE,
  ".bmp": MediaT.IMAGE,
  ".webp": MediaT.IMAGE
} as const



// Helpers
export function find_origin(_byName: string): Origin | undefined {
  console.debug("Finding origin: ", _byName)
  const folder = GALLERY_FOLDER.find_sync(_byName, isn.Folder)
  console.debug("Found folder: ", folder)
  return folder ? new Origin(folder.name()) : undefined
}
export function list_origins(): Origin[] {
  return GALLERY_FOLDER.list_sync().map(folder => new Origin(folder.name()))
}



export class Origin extends isn.Folder {
  constructor(_name: string) {
    super(join(GALLERY_FOLDER.isAt, _name))
  }
  list_personas(): Persona[] {
    return this.list_sync().map(folder => new Persona(this, folder.name()))
  }
  find_persona(_byName: string): Persona | undefined {
    const folder = this.find_sync(_byName, isn.Folder)
    return folder ? new Persona(this, folder.name()) : undefined
  }
  // Disable all modification/copy methods
  override rename_sync(_: string): never { throw new Error("Tried renaming an Origin") }
  override move_sync(_: isn.Folder): never { throw new Error("Tried moving an Origin") }
  override copy_sync(_: isn.Folder): never { throw new Error("Tried copying an Origin") }
  override delete_sync(): never { throw new Error("Tried deleting an Origin") }
  override rename(_: string): never { throw new Error("Tried renaming an Origin") }
  override move(_: isn.Folder): never { throw new Error("Tried moving an Origin") }
  override copy(_: isn.Folder): never { throw new Error("Tried copying an Origin") }
  override delete(): never { throw new Error("Tried deleting an Origin") }
}


export class Persona extends isn.Folder {
  constructor(origin: Origin, name: string) {
    super(join(origin.isAt, name))
  }
  from(): Origin {
    return new Origin(this.parent().name())
  }
  list_portrayals(): Portrayal[] {
    return this.list_sync(isn.File).map(file => {
      const index = Number(file.name().split('_')[0])
      return new Portrayal(index, this)
    })
  }
  find_portrayal(_byIndex: number): Portrayal | undefined {
    const file = this.list_sync(isn.File).find(file => file.name().startsWith(`${_byIndex}`))
    return file ? new Portrayal(_byIndex, this) : undefined
  }
  // Disable all modification/copy methods
  override rename_sync(_: string): never { throw new Error("Tried renaming a Persona") }
  override move_sync(_: isn.Folder): never { throw new Error("Tried moving a Persona") }
  override copy_sync(_: isn.Folder): never { throw new Error("Tried copying a Persona") }
  override delete_sync(): never { throw new Error("Tried deleting a Persona") }
  override rename(_: string): never { throw new Error("Tried renaming a Persona") }
  override move(_: isn.Folder): never { throw new Error("Tried moving a Persona") }
  override copy(_: isn.Folder): never { throw new Error("Tried copying a Persona") }
  override delete(): never { throw new Error("Tried deleting a Persona") }
}


export class Portrayal extends isn.File {
  constructor(_index: number, _persona: Persona) {
    const presumablySelf = _persona.list_sync(isn.File).find(file => file.name().startsWith(`${_index}`))
    if (!presumablySelf)
      throw new Error(`Portrayal file not found for index ${_index} in persona ${_persona.name()}`)
    super(presumablySelf.isAt)
  }
  index(): number {
    return Number(this.name().split('_')[0])
  }
  from(): Persona {
    return new Persona(new Origin(this.parent().parent().name()), this.parent().name())
  }
  type(): MediaT {
    return EXTENSION_TO_MEDIA[this.ext().toLowerCase()]!
  }
  tags(): TagT[] {
    return this.name().split('_')[1]!.split('').map(tag => to_TagT(tag)) // Something like "1a2B"
  }
  // Disable all modification/copy methods (reading is oki)
  override rename_sync(_: string): never { throw new Error("Tried renaming a Portrayal") }
  // override move_sync(_: isn.Folder): never { throw new Error("Tried moving a Portrayal") } // Temporarily allow moving (DEBUGGING ONLY)
  override copy_sync(_: isn.Folder): never { throw new Error("Tried copying a Portrayal") }
  override delete_sync(): never { throw new Error("Tried deleting a Portrayal") }
  override rename(_: string): never { throw new Error("Tried renaming a Portrayal") }
  override move(_: isn.Folder): never { throw new Error("Tried moving a Portrayal") }
  override copy(_: isn.Folder): never { throw new Error("Tried copying a Portrayal") }
  override delete(): never { throw new Error("Tried deleting a Portrayal") }
  override write_text_sync(_: string): never { throw new Error("Tried writing (text sync) to a Portrayal") }
  override write_text(_: string): never { throw new Error("Tried writing (text async) to a Portrayal") }
  override append_text_sync(_: string): never { throw new Error("Tried appending (text sync) to a Portrayal") }
  override append_text(_: string): never { throw new Error("Tried appending (text async) to a Portrayal") }
  override write_bytes_sync(_: Buffer): never { throw new Error("Tried writing (bytes sync) to a Portrayal") }
  override write_bytes(_: Buffer): never { throw new Error("Tried writing (bytes async) to a Portrayal") }
  override append_bytes_sync(_: Buffer): never { throw new Error("Tried appending (bytes sync) to a Portrayal") }
  override append_bytes(_: Buffer): never { throw new Error("Tried appending (bytes async) to a Portrayal") }
  override create_write_stream(): never { throw new Error("Tried creating write stream to a Portrayal") }
}


export function list_all_unsorted_portrayals(_lookIn: isn.Folder = UNSORTED_FOLDER, _existing?: isn.File[]): isn.File[] {
  /*
    Recursively list all files in the unsorted folder
    and its subfolders and return them as an array
    sorted by modification date
  */
  let result: isn.File[] = []
  for (const entry of _lookIn.list_sync())
    if (entry instanceof isn.Folder)
      result = result.concat(list_all_unsorted_portrayals(entry, _existing))
    else if (entry instanceof isn.File)
      result.push(entry)
  result.sort((a, b) => a.stats_sync().mtime.getTime() - b.stats_sync().mtime.getTime())
  return result
}


export function create_portrayal(_persona: Persona, _tags: TagT[], _fromUnsorted: isn.File): Portrayal {
  /*
    Move a file from unsorted to the given persona folder
    and rename it according to the next available index
    and given tags
  */
  const nextOpenIndex = _persona.list_portrayals().length
  _fromUnsorted.rename_sync(`A36M_TEMP_${Math.random().toString(36)}${_fromUnsorted.ext()}`) // Temporary random name to avoid conflicts
  _fromUnsorted.move_sync(_persona)
  _fromUnsorted.rename_sync(`${nextOpenIndex}_${_tags.join("")}_${_fromUnsorted.ext()}`)
  return new Portrayal(nextOpenIndex, _persona)
}


export function all_portrayals(): Portrayal[] {
  return list_origins().flatMap(origin => origin.list_personas().flatMap(persona => persona.list_portrayals()))
}


export function make_portrayal_bundle(_portrayals: Portrayal[], _filterOptions: { byPersonas?: Persona[], byTags?: TagT[] }): Portrayal[] {
  /*
    From a list of portrayals, make a bundle according
    to the filter options. If a portrayal any of the
    filter options, it is included in the result. (OR logic)
  */
  return _portrayals.filter(portrayal =>
    (_filterOptions.byPersonas && _filterOptions.byPersonas.length > 0 &&
      _filterOptions.byPersonas.some(persona => persona.isAt === portrayal.from().isAt))
    || (_filterOptions.byTags && _filterOptions.byTags.length > 0 &&
      _filterOptions.byTags.some(tag => portrayal.tags().includes(tag)))
  )
}