import { BOM, EmptyBoM, BoMItem, EmptyBoMItem } from "./extension";
import * as vscode from 'vscode';
interface Transcoder {
	[key:string]:string;
}



function ReplacewithObject (transcoder:Transcoder,str:string):string{
	let tempreturn:string=str;
	for (let key in transcoder){
	tempreturn=tempreturn.replace(key,transcoder[key]);
	}
	return tempreturn;
}

export function parseEditor(EditorTxt: string): BOM[] {
	const UTF8replacement: Transcoder=vscode.workspace.getConfiguration('bomarkdown').get('UTF8replacement')||{};


	// Split de l'editor sur les saut de ligne
	let EditorArray: string[] = EditorTxt.split(/\r?\n/).filter((c: string) => c !== "");
	// init des variable de la fonction
	let tempBOM: BOM = JSON.parse(EmptyBoM);
	let tempid: number = 0;
	let BOMtable: BOM[] = [];
	let tempparentid: number[] = [-1];
	let tempcolumn: number = 0;
	let tempparentlevel: number = 0;
	tempBOM.BoMItems = [];

	// Boucle sur toutes les ligne de l'editor
	for (const item of EditorArray) {

		let tempitem: BoMItem = JSON.parse(EmptyBoMItem);
		// test de la comande new column
		if (item == "+newcolumn") {
			tempBOM.column = tempcolumn;
			BOMtable.push(tempBOM);
			tempBOM = JSON.parse(EmptyBoM);
			tempcolumn++;
		} else {
			// on detecte le niveau	
			let tempArray: string[] = [];
			tempArray = item.split("+ ");
			// on ignore les ligne qui n'ont pas de +
			if (tempArray.length == 2) {
				tempitem.id = tempid;
				let tempargs: string = tempArray[1];

				//			if (tempArray[0].length>tempparentid.length-1>){
				//				tempparentid.push(tempid-1)
				//				tempitem.level=tempArray[0].length;
				//			} else{
				// C'est un enfant
				tempitem.level = tempArray[0].length;
				tempitem.Parentid = tempparentid[tempitem.level];
				tempparentid[tempitem.level + 1] = tempid;
				//			}	
				tempArray = [];
				// Parsing du texte a droite des +
				tempArray = tempargs.split(/\(|\)/).filter((c: string) => c !== "");
				// Block pour sortir en cas d'erreur de parsing
				argparsing: {
					for (const arg of tempArray) {
						// test sur les 2 premier char de chaque bloc
						switch (arg.substring(0, 2)) {
							case "e:":
								// effectivié
								tempitem.effectivity = ReplacewithObject(UTF8replacement,arg.substring(2));
								break;
							case "i:":
								// TNR
								const TNRarray = arg.substring(2).split(",");
								switch (TNRarray.length) {
									case 1:
										// si une valeur alors c'est un label
										tempitem.Label = TNRarray[0];
										break;
									case 2:
										// Si 2 valeur c'est Type, Label
										tempitem.Type = TNRarray[0];
										tempitem.Label = TNRarray[1];
										break;
									case 3:
										// si 3 valeur c'est Type label revision
										tempitem.Type = TNRarray[0];
										tempitem.Label = TNRarray[1];
										tempitem.revision = TNRarray[2];
										break;
									default:
										// Si plus de valeurs on dumpe dans le label
										tempitem.Label = arg.substring(2);
								}
								break;
							case "l:":
								// Gesiton des lien et des ALias Alias avant le / liste d'alias en lien apres
								let larray: string[] = [];
								larray = arg.substring(2).split("/");
								if (larray.length >= 1) {
									tempitem.alias = larray[0];
								}
								if (larray.length == 2) {
									const temprelatives = larray[1].split(",").filter((c: string) => c !== "");
									if (temprelatives) {
										tempitem.relatives = temprelatives;
									}
								}

								break;
							case "b:":
								// liste des bulles
								tempitem.bubbles = arg.substring(2).split(",");
								break;
							case "s:":
								// status
								tempitem.status = arg.substring(2);
								break;
							default:
								// Si on n'est pas dans les pattern d'avant
								if (tempArray.length > 1) {
									// il il y a quand meme des ()
									delete tempitem.revision;
									delete tempitem.alias;
									delete tempitem.relatives;
									delete tempitem.effectivity;
									delete tempitem.status;
									tempitem.badparsing = true;
								}
								// si il n'y a rien on a juste un label
								tempitem.Label = tempargs;
								break argparsing;



						}

					}
				}

				tempBOM.BoMItems.push(tempitem);
			}
		}
		tempid++;

	}

	tempBOM.column = tempcolumn;
	BOMtable.push(tempBOM);
	return BOMtable;
}
