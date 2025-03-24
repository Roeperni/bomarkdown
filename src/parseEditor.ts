import { BOM, EmptyBoM, BoMItem, emphasis,EmptyBoMItem ,link,BOMdata,Objsetting} from "./extension";
import * as vscode from 'vscode';
export interface Transcoder {
	[key:string]:string;
}


// in a string replace each key with its value
export function ReplacewithObject (transcoder:Transcoder,str:string):string{
	let tempreturn:string=str;
	for (let key in transcoder){
	tempreturn=tempreturn.replace(key,transcoder[key]);
	}
	return tempreturn;
}


// detect block with inner () compatiblity
function blockparser (inputtable:string[],startbloc:RegExp,endbloc:RegExp):string[]{
	let tempbloctable:string[]=[];
	let Bindex:number=-1;
	for (let i=0;i<inputtable.length-1;i++){
		if (inputtable[i].match(startbloc)){
			if (Bindex>=0){
				if (inputtable[i-1].match(endbloc)){
					tempbloctable.push(inputtable.slice(Bindex,i-1).join(""));

				}else{
					tempbloctable.push(inputtable.slice(Bindex,i).join(""));
				}			
		}

		Bindex=i;
		inputtable[i]=inputtable[i].substring(1);
		}
	}
	let i=inputtable.length-1
	while (i>Bindex && !inputtable[i].match(endbloc)){
		i--;
	}
	if (Bindex==-1){
		tempbloctable.push(inputtable.join(""));

	} else {
		if (i>Bindex){
			tempbloctable.push(inputtable.slice(Bindex,i).join(""));

		}else{
			tempbloctable.push(inputtable.slice(Bindex).join(""));

		}
	}

	return tempbloctable;
}


// parse the text bloc into a BOM[] object
export function parseEditor(EditorTxt: string): BOMdata{
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
	let bomstart:Number=0;
	let temparg:Objsetting={};
	tempBOM.BoMItems = [];
	// test de la presence d'un bloc de param
	if (EditorArray[0]=="${{"){
	
		const endparambloc=EditorArray.findIndex((end)=>end=="}}$");
		//un bloc de param a été trouvé
		if (endparambloc>0){
			 bomstart=endparambloc+1;
			 const argjson:string="{"+ EditorArray.slice(1,endparambloc).join(" ")+"}";
			 temparg=JSON.parse(argjson);

		} 
	}
	// Boucle sur toutes les ligne de l'editor
	for (const item of EditorArray) {

		let tempitem: BoMItem = JSON.parse(EmptyBoMItem);
		// test de la comande new column
		if (item.substring(0,10) == "+newcolumn") {
			tempBOM.column = tempcolumn;
			BOMtable.push(tempBOM);
			tempBOM = JSON.parse(EmptyBoM);
			// detection d'un gap suppplémentaire pour la nouvelle colonne
			let tempcolumngap=item.substring(11);
			if (tempcolumngap){tempBOM.x=Number(tempcolumngap)}
			tempcolumn++;
		} else {
			// on detecte le niveau	
			let tempArray: string[] = [];
			tempArray = item.split("+ ");
			// on ignore les ligne qui n'ont pas de +, le + est aussi un caractère interdit dans la ligne
			if (tempArray.length == 2) {
				tempitem.id = tempid;
				let tempargs: string = tempArray[1];

				tempitem.level = tempArray[0].length;
				tempitem.Parentid = tempparentid[tempitem.level];
				tempparentid[tempitem.level + 1] = tempid;
				//			}	
				tempArray = [];
				// Parsing du texte a droite des +
				tempArray = tempargs.split(/\(|\)/).filter((c: string) => c !== "");
				let tempArray2=tempargs.split(/(\([ialbse]\:|\))/).filter((c: string) => c !== "");
				tempArray2=blockparser(tempArray2,/\([ialbse]\:/,/\)/).filter((c: string) => c !== "");
				//console.log(tempArray2.join("|"))

				// Block pour sortir en cas d'erreur de parsing
				argparsing: {
					for (const arg of tempArray2) {
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
							case "a:":
								tempitem.alias=arg.substring(2);
								break;
							case "l:":
								// Gesiton des lien et des ALias Alias avant le / liste d'alias en lien apres
								let larray: string[] = [];
								let templink:link={relative:"",linktype:"i",linkalias:"",aliaspos:"m",label_y:0,label_x:0};
								let objprelatives:link[]=[];
								if (tempitem.relatives)
									{
										objprelatives=tempitem.relatives;
									}


								larray = arg.substring(2).split(":");
								if (larray.length >= 1) {
									templink.linktype = larray[0];
								}
								if (larray.length == 2) {
									const temprelatives = larray[1].split(",").filter((c: string) => c !== "");
									for (const alias of temprelatives){
										const lblidx=alias.indexOf("!");
										if (lblidx>0){
											switch (alias.substring(lblidx+1,lblidx+2)){
												case "<":
													objprelatives.push({relative:alias.substring(0,lblidx),linktype:larray[0],linkalias:alias.substring(lblidx+2),aliaspos:"b",label_x:0,label_y:0});
													break;
												case ">":
													objprelatives.push({relative:alias.substring(0,lblidx),linktype:larray[0],linkalias:alias.substring(lblidx+2),aliaspos:"e",label_x:0,label_y:0});
													break;
												default:
													objprelatives.push({relative:alias.substring(0,lblidx),linktype:larray[0],linkalias:alias.substring(lblidx+2),aliaspos:"m",label_x:0,label_y:0});
													break;
											}

										} else{

										objprelatives.push({relative:alias,linktype:larray[0],linkalias:"",aliaspos:"m",label_x:0,label_y:0});
									}
									}
									tempitem.relatives=objprelatives;
								}

								break;
							case "b:":
								// liste des bulles
								if (tempitem.bubbles) {
									tempitem.bubbles = tempitem.bubbles?.concat(arg.substring(2).split(","));
								} else{
									tempitem.bubbles =arg.substring(2).split(",");
								}
								break;
							case "s:":
								// status
								tempitem.status = arg.substring(2);
								break;
							default:
								// Si on n'est pas dans les pattern d'avant
								if (tempArray2.length == 1) {
									// si il n'y a rien on a juste un label

									tempitem.Label = tempargs;
								}
									// il il y a quand meme des ()
									//delete tempitem.revision;
									//delete tempitem.alias;
									//delete tempitem.relatives;
									//delete tempitem.effectivity;
									//delete tempitem.status;
									//tempitem.badparsing = true;
								
								break ;



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
	return {BOMs:BOMtable,params:temparg};
}