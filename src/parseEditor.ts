import { relative } from "path";
import { BOM,  BoMItem, emphasis ,link,BOMdata,Objsetting,legend,Icon,legenditem,Linksdefinitions,ObjsettingWlabel, Label,tag, tagstyles, tagstyle, fontsettings} from "./extension";
import * as vscode from 'vscode';
export interface Transcoder {
	[key:string]:string;
}


// in a string replace each key with its value
export function ReplacewithObject (transcoder:Transcoder,str:string):string{
	let tempreturn:string=str;
	for (let key in transcoder){
	tempreturn=tempreturn.replaceAll(key,transcoder[key]);
	}
	return tempreturn;
}


function emphparser(Label:string,emphasises:emphasis[]){
    for (let emph of emphasises){
        const re=new RegExp(emph.regex,"g");
        const matched=Label.match(re);
        if (matched){
        for (let m of matched){
            const replacer=`<tspan font-weight="${emph.weight}" font-style="${emph.style}" ${emph.svgparam}>${m.replaceAll(emph.expression,"")}</tspan>`;
            Label=Label.replace(m,replacer);

        }
    }

    }
	return Label;
}





function labelparser (transcoder:Transcoder,str:string,emphasises:emphasis[]):string{
		let replacedstring:string=emphparser(ReplacewithObject(transcoder,str),emphasises);
		let labelarray:string[]=replacedstring.split("§");
		let tempreturn:string;
		if (labelarray.length>1){
			tempreturn='<tspan  x="0" dy="1em">'+labelarray.join('</tspan><tspan  x="0" dy="1em">')+'</tspan>';

		}else{
			tempreturn='<tspan  x="0" dy="1em">'+labelarray[0]+'</tspan>';
		}

	return tempreturn;
}

export function legendextract (BOMtable:BOM[]):legend {
	
	let templegend:legend={types:[],links:[],status:[],bubbles:[]};
	for (const BOM of BOMtable){
		for( const item of BOM.BoMItems){
			if (!templegend.types.includes(item.Type)){templegend.types.push(item.Type);}
			if (item.parent_link_type!=="h"){
				if (!templegend.links.includes(item.parent_link_type)){templegend.links.push(item.parent_link_type);}
			}
			if (item.relatives){
				for (const rel of item.relatives){
					if (!templegend.links.includes(rel.linktype)){templegend.links.push(rel.linktype);}
				}
			}
			if (item.bubbles){
				for (const bub of item.bubbles){
					if (!templegend.bubbles.includes(bub)){templegend.bubbles.push(bub);}
				}
			}
			if (item.status){
				
					if (!templegend.status.includes(item.status)){templegend.status.push(item.status);}
				
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
		const typeicon :any|undefined=icons.find(i =>i.name===typ);
		if (typeicon){
			if (typeicon.label){
				templabel=typeicon.label;
			}else {
				templabel=typeicon.name;
			}
			templegenditems.push({type:"object",name:typ,label:templabel,w:0});
		}
	}
	for (const typ of legend.links ){
			if (typ in linkstyle){
			if (linkstyle[typ].label){
				templabel=linkstyle[typ].label;
			}else {
				templabel=typ;
			}
			

			templegenditems.push({type:"link",name:typ,label:templabel,w:0});
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
	let k:number;
	for (let i=0;i<inputtable.length-1;i++){
		if (inputtable[i].match(startbloc)){

			if (Bindex>=0){
				k=i-1;
				while (k>Bindex && !inputtable[k].match(endbloc)){
					k--;
				}
				tempbloctable.push(inputtable.slice(Bindex,k).join(""));
			}

		Bindex=i;
		inputtable[i]=inputtable[i].substring(1);
		}
	}
	let i=inputtable.length-1;
	while (i>Bindex && !inputtable[i].match(endbloc)){
		i--;
	}
	if (Bindex===-1){
		tempbloctable.push(inputtable.join(""));

	} else {
		if (i>Bindex){
			tempbloctable.push(inputtable.slice(Bindex,i).join(""));
		}
	}

	return tempbloctable;
}


// parse the text bloc into a BOM[] object
export function parseEditor(EditorTxt: string,path:string,Duri:vscode.Uri): BOMdata{
	const UTF8replacement: Transcoder=vscode.workspace.getConfiguration('bomarkdown').get('UTF8replacement')||{};
	const linkstyle:Linksdefinitions=vscode.workspace.getConfiguration('bomarkdown').get('Linksdefinition')||{};
	let tagstyles:tagstyles=vscode.workspace.getConfiguration('bomarkdown').get('tagstyles')||{default:new(tagstyle)};;
	let emphasis: emphasis[] = vscode.workspace.getConfiguration('bomarkdown').get('emphasis') || [];
	let fontdefs:fontsettings=vscode.workspace.getConfiguration('bomarkdown').get('fontdefs')||new(fontsettings);



	// Split de l'editor sur les saut de ligne
	let EditorArray: string[] = EditorTxt.split(/\r?\n/).filter((c: string) => c !== "");
	// init des variable de la fonction
	let tempBOM: BOM = new(BOM);
	let tempid: number = 0;
	let BOMtable: BOM[] = [];
	let tempparentid: number[] = [-1];
	let tempcolumn: number = 0;
	let bomstart:Number=0;
	let temparg:Objsetting={};

	// test de la presence d'un bloc de param
	if (EditorArray[0]==="${{"){
	
		const endparambloc=EditorArray.findIndex((end)=>end==="}}$");
		//un bloc de param a été trouvé
		if (endparambloc>0){
			 bomstart=endparambloc+1;
			 const argjson:string="{"+ EditorArray.slice(1,endparambloc).join(" ")+"}";
			 temparg=JSON.parse(argjson);

		} 
	}
	if ("emphasis" in temparg) { emphasis = temparg.emphasis; }
	if ("tagstyles" in temparg){ 
		let temptagstyles={...tagstyles,...temparg.tagstyles};
		tagstyles=temptagstyles;
	}
	// Boucle sur toutes les ligne de l'editor
	for (const item of EditorArray) {

		let tempitem: BoMItem = new(BoMItem);
		// test de la comande new column
		if (item.substring(0,10) === "+newcolumn") {
			tempBOM.column = tempcolumn;
			BOMtable.push(tempBOM);
			tempBOM = new(BOM);
			// detection d'un gap suppplémentaire pour la nouvelle colonne
			let tempcolumngap=item.substring(11);
			if (tempcolumngap){tempBOM.x=Number(tempcolumngap);}
			tempcolumn++;
		} else {
			// on detecte le niveau	
			let tempArray: string[] = [];
			tempArray = item.split("+ ");
			// on ignore les ligne qui n'ont pas de +, le + est aussi un caractère interdit dans la ligne
			if (tempArray.length === 2) {
				tempitem.id = tempid;
				let tempargs: string = tempArray[1];
				let temptags:tag[]=[];
				tempitem.level = tempArray[0].length;
				tempitem.parent_link_type="h";
				tempitem.Parentid = tempparentid[tempitem.level];
				if (tempitem.level>0){
					const linkkey:string=tempArray[0].slice(-1);
					if (linkkey in linkstyle || linkkey==="-"){
						tempitem.parent_link_type=linkkey;
					} 

				}
				tempparentid[tempitem.level + 1] = tempid;
				//			}	
				tempArray = [];
				// Parsing du texte a droite des +
				tempArray = tempargs.split(/\(|\)/).filter((c: string) => c !== "");
				let tempArray2=tempargs.split(/(\([ialbset@]\:|\))/).filter((c: string) => c !== "");
				tempArray2=blockparser(tempArray2,/\([ialbset@]\:/,/\)/).filter((c: string) => c !== "");
				//console.log(tempArray2.join("|"))

				// Block pour sortir en cas d'erreur de parsing
				argparsing: {
					for (const arg of tempArray2) {
						// test sur les 2 premier char de chaque bloc
						
						switch (arg.substring(0, 2)) {
							case "e:":
								// effectivié
								tempitem.effectivity=new(Label);
								tempitem.effectivity.text = labelparser(UTF8replacement,arg.substring(2),emphasis);
								break;
							case "i:":
								// TNR
								const TNRarray = arg.substring(2).split(",");
								tempitem.Label=new(Label);
								switch (TNRarray.length) {
									case 1:
										// si une valeur alors c'est un label
										tempitem.Label.text = labelparser(UTF8replacement,TNRarray[0],emphasis);
										break;
									case 2:
										// Si 2 valeur c'est Type, Label
										tempitem.Type = TNRarray[0];
										tempitem.Label.text = labelparser(UTF8replacement,TNRarray[1],emphasis);
										break;
									case 3:
										// si 3 valeur c'est Type label revision
										tempitem.Type = TNRarray[0];
										tempitem.Label.text = labelparser(UTF8replacement,TNRarray[1],emphasis);
										tempitem.revision = TNRarray[2];
										break;
									default:
										// Si plus de valeurs on dumpe dans le label
										tempitem.Label.text = labelparser(UTF8replacement,arg.substring(2),emphasis);
								}
								break;
							case "a:":
								tempitem.alias=arg.substring(2);
								break;
							case "l:":
								// Gesiton des lien et des ALias Alias avant le / liste d'alias en lien apres
								let larray: string[] = [];
								let templink:link=new(link);
								let objprelatives:link[]=[];
								if (tempitem.relatives)
									{
										objprelatives=tempitem.relatives;
									}


								larray = arg.substring(2).split(":");
								if (larray.length >= 1) {
									templink.linktype = larray[0];
								}
								if (larray.length === 2) {
									const temprelatives = larray[1].split(",").filter((c: string) => c !== "");
									for (const alias of temprelatives){
										let pushrelative=new(link);
										const lblidx=alias.indexOf("!");
										if (lblidx>0){
											pushrelative.relative=alias.substring(0,lblidx);
											pushrelative.linktype=larray[0];
											
											switch (alias.substring(lblidx+1,lblidx+2)){
												case "<":
													pushrelative.linklabel.text=labelparser(UTF8replacement,alias.substring(lblidx+2),emphasis);
													pushrelative.aliaspos="e";
													
													break;
												case ">":
													pushrelative.linklabel.text=labelparser(UTF8replacement,alias.substring(lblidx+2),emphasis);
													pushrelative.aliaspos="b";
													
													break;
												default:
													pushrelative.linklabel.text=labelparser(UTF8replacement,alias.substring(lblidx+1),emphasis);
													pushrelative.aliaspos="m";
													
													break;
											}

										} else{

										pushrelative.relative=alias;
										pushrelative.linktype=larray[0];
										
									}
									objprelatives.push(pushrelative);
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
							case "t:":
								// parsing des tag
								const Tagarray = arg.substring(2).split(",");
								let temptag=new(tag);
								
								temptag.Ltag.text=labelparser(UTF8replacement,Tagarray[0],emphasis);
								temptag.font=fontdefs.wtag;
								if (Tagarray.length===2) {
									
										if (Tagarray[1] in tagstyles) {
											temptag.rect=tagstyles[Tagarray[1]].rect;
											const tempfont:string=tagstyles[Tagarray[1]].fontdef;
											if (tempfont in fontdefs){
												temptag.font=fontdefs[tagstyles[Tagarray[1]].fontdef as keyof fontsettings];
											}
										}else{
											let temprect={...tagstyles.regular.rect};
											temprect.fill=Tagarray[1];
											temptag.rect={...temprect};
											const tempfont= tagstyles.regular.fontdef;
											temptag.font=fontdefs[tempfont as keyof fontsettings];
											
										}
										
													

								temptags.push(temptag);
									}
								break;
							case "@":
								break;
							default:
								// Si on n'est pas dans les pattern d'avant
								if (tempArray2.length === 1) {
									// si il n'y a rien on a juste un label

									tempitem.Label.text = labelparser(UTF8replacement,tempargs,emphasis);
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

				tempitem.tags=temptags;
				tempBOM.BoMItems.push(tempitem);
				
			}
		}
		tempid++;

	}

	tempBOM.column = tempcolumn;
	BOMtable.push(tempBOM);
	return {BOMs:BOMtable,params:temparg,path:path,Duri:Duri.fsPath};
}

export function bomgen(Eltab:string[],lvl:number,prefix:string):string{
// todo controle de l'input + gestion type de lien
	let tempstr:string="";
	let nb:number;
	
	if (Eltab[0] !== undefined){
	const Elem=Eltab[0].split(",");
	let link:string=" ";
	let rev:string="";
	// on a type , nombre, prefix ,lien
	if (Elem.length>=3){
	const type=Elem[0];
	if (Elem[4] !==undefined){link=Elem[4];}
	if (Elem[3] !==undefined){rev=(Elem[3]);}
	if (Elem[1].includes("-")){
		const tabminmax=Elem[1].split("-");
		 nb=Math.round(Math.random()*(Number(tabminmax[1])-Number(tabminmax[0]))+Number(tabminmax[0]));
	} else{
		nb=+Elem[1];
	}

	let childtab:string[]=Eltab.slice(1);
	for (let i=1;i<=nb ;i++){
			if(lvl>0){
				tempstr+=" ".repeat(lvl-1)+link+"+ (i:"+Elem[0]+","+Elem[2]+prefix+i;
			} else{
				tempstr+="+ (i:"+Elem[0]+","+Elem[2]+prefix+i;
			}
			if(rev!==""){
				tempstr+=","+rev+")\n";
			} else{
				tempstr+=")\n";

			}
			if (childtab.length>0){
				tempstr+=bomgen(childtab,lvl+1,prefix+i+".");
			}
	}
	
	}
	}
	return tempstr;

}