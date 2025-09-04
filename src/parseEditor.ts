import { BOM,  BoMItem, emphasis ,link,BOMdata,Objsetting,legend,Icon,legenditem,Linksdefinitions,ObjsettingWlabel} from "./extension";
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

export function legendextract (BOMtable:BOM[]):legend {
	
	let templegend:legend={types:[],links:[],status:[],bubbles:[]};
	for (const BOM of BOMtable){
		for( const item of BOM.BoMItems){
			if (!templegend.types.includes(item.Type)){templegend.types.push(item.Type)}
			if (item.parent_link_type!="h"){
				if (!templegend.links.includes(item.parent_link_type)){templegend.links.push(item.parent_link_type)}
			}
			if (item.relatives){
				for (const rel of item.relatives){
					if (!templegend.links.includes(rel.linktype)){templegend.links.push(rel.linktype)}
				}
			}
			if (item.bubbles){
				for (const bub of item.bubbles){
					if (!templegend.bubbles.includes(bub)){templegend.bubbles.push(bub)}
				}
			}
			if (item.status){
				
					if (!templegend.status.includes(item.status)){templegend.status.push(item.status)}
				
			}
		}
	}
	return templegend;
}

export function Parselegendbloc (legend:legend,icons:Icon[]):legenditem[]{
	
	const linkstyle:Linksdefinitions=vscode.workspace.getConfiguration('bomarkdown').get('Linksdefinition')||{};
	const Status_Settings:ObjsettingWlabel=vscode.workspace.getConfiguration('bomarkdown').get('satus')||{};
	const bubbles_Settings:ObjsettingWlabel=vscode.workspace.getConfiguration('bomarkdown').get('bubbles')||{};




	let templegenditems:legenditem[]=[];
	let templabel:string="";
	for (const typ of legend.types ){
		const typeicon :any|undefined=icons.find(i =>i.name==typ);
		if (typeicon){
			if (typeicon.label){
				templabel=typeicon.label;
			}else {
				templabel=typeicon.name;
			}
			templegenditems.push({type:"object",name:typ,label:templabel,w:0})
		}
	}
	for (const typ of legend.links ){
			if (typ in linkstyle){
			if (linkstyle[typ].label){
				templabel=linkstyle[typ].label;
			}else {
				templabel=typ;
			}
			

			templegenditems.push({type:"link",name:typ,label:templabel,w:0})
		}
		}
		for (const status of legend.status ){
			if (status in Status_Settings){
				templabel=Status_Settings[status].label;
				templegenditems.push({type:"status",name:status,label:templabel,w:0});
			}
		}
		for (const bub of legend.bubbles ){
			if (bub in bubbles_Settings){
				templabel=bubbles_Settings[bub].label;
				templegenditems.push({type:"bubble",name:bub,label:templabel,w:0});


			}
		}


	return templegenditems;
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
export function parseEditor(EditorTxt: string,path:string,Duri:vscode.Uri): BOMdata{
	const UTF8replacement: Transcoder=vscode.workspace.getConfiguration('bomarkdown').get('UTF8replacement')||{};
	const linkstyle:Linksdefinitions=vscode.workspace.getConfiguration('bomarkdown').get('Linksdefinition')||{};



	// Split de l'editor sur les saut de ligne
	let EditorArray: string[] = EditorTxt.split(/\r?\n/).filter((c: string) => c !== "");
	// init des variable de la fonction
	let tempBOM: BOM = new(BOM);
	let tempid: number = 0;
	let BOMtable: BOM[] = [];
	let tempparentid: number[] = [-1];
	let tempcolumn: number = 0;
	let tempparentlevel: number = 0;
	let bomstart:Number=0;
	let temparg:Objsetting={};

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

		let tempitem: BoMItem = new(BoMItem);
		// test de la comande new column
		if (item.substring(0,10) == "+newcolumn") {
			tempBOM.column = tempcolumn;
			BOMtable.push(tempBOM);
			tempBOM = new(BOM);
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
				tempitem.parent_link_type="h";
				tempitem.Parentid = tempparentid[tempitem.level];
				if (tempitem.level>0){
					const linkkey:string=tempArray[0].slice(-1);
					if (linkkey in linkstyle){
						tempitem.parent_link_type=linkkey;
					}

				}
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
								let templink:link={relative:"",linktype:"i",linklabel:"",linklblw:0,aliaspos:"m",label_y:0,label_x:0,label_align:"",label_box_x:0,geom:{spx:0,spy:0,fpx:0,fpy:0,cf:0,cs:0}};
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
													objprelatives.push({relative:alias.substring(0,lblidx),linktype:larray[0],linklabel:alias.substring(lblidx+2),aliaspos:"e",label_x:0,label_y:0,label_align:"",label_box_x:0,linklblw:0,geom:{spx:0,spy:0,fpx:0,fpy:0,cf:0,cs:0}});
													break;
												case ">":
													objprelatives.push({relative:alias.substring(0,lblidx),linktype:larray[0],linklabel:alias.substring(lblidx+2),aliaspos:"b",label_x:0,label_y:0,label_align:"",label_box_x:0,linklblw:0,geom:{spx:0,spy:0,fpx:0,fpy:0,cf:0,cs:0}});
													break;
												default:
													objprelatives.push({relative:alias.substring(0,lblidx),linktype:larray[0],linklabel:alias.substring(lblidx+1),aliaspos:"m",label_x:0,label_y:0,label_align:"",label_box_x:0,linklblw:0,geom:{spx:0,spy:0,fpx:0,fpy:0,cf:0,cs:0}});
													break;
											}

										} else{

										objprelatives.push({relative:alias,linktype:larray[0],linklabel:"",aliaspos:"m",label_x:0,label_y:0,label_align:"",linklblw:0,label_box_x:0,geom:{spx:0,spy:0,fpx:0,fpy:0,cf:0,cs:0}});
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
	return {BOMs:BOMtable,params:temparg,path:path,Duri:Duri.fsPath};
}