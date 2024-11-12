# bomarkdown README

BomMarkdown is an extension that generetates a SVG representaion of a Bill of material (like a tree) from a textual description. It is inspired by other text to graph tools like plantuml or mermaid.js
 [image avec le texte a gauche et le graph a droite]

## Features

### BOM Preview

#### BOM syntax

##### Heirachy

To create a BOM you must use the following notation:
::: code
+ first root first column
-+ Child
++ It works as long as there is a plus followed by a space
 + but space is more convinient in vs code
  + new sub level

linewith no + are ignored
to add a new column juste type
+newcolumn
+ second root new ncolumn
 +  A child
+ several root on the same column
 + another child

:::

### BOM Export

### BOM Commands

### Addicon

## Requirements

No dependencies

## Extension Settings

Include if your extension adds any VS Code settings through the `contributes.configuration` extension point.

For example:

This extension contributes the following settings:

* `myExtension.enable`: Enable/disable this extension.
* `myExtension.thing`: Set to `blah` to do something.

## Known Issues

None yet

## Release Notes

### 0.1.0

Initial release of BomMarkdown

---
