import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import {Icon,BOM,Implink,bend, BoMItem,h, panh, iconw, topoffset,extlog} from "./extension";
import {panv} from './Computelayout';

interface Objsetting {
	[key:string]:string;
}

const EmptyLink: string='{"spx":0,"spy":0,"fpx":0,"fpy":0,"cf":0,"cs":0}'
const implementlinkcolor:string=vscode.workspace.getConfiguration('bomarkdown').get('ImplemColor')||"black";
const revbackground= vscode.workspace.getConfiguration('bomarkdown').get('revision.background');
const revfontcolor= vscode.workspace.getConfiguration('bomarkdown').get('revision.font');



function getBOMCommandsB64(jsonpath:string):string{
    const gap: number=vscode.workspace.getConfiguration('bomarkdown').get('gap')||2;
	let rawdata = fs.readFileSync(jsonpath,"utf-8");
	let icons:Icon[] = JSON.parse(rawdata);
	let commands:string=`

<svg width="50%" height="${icons.length*(h+gap)}px" style="background-color:white" xmlns="http://www.w3.org/2000/svg" version="1.1" xmlns:xlink="http://www.w3.org/1999/xlink">	
`;
	let nbicon:number=0;
	for (const icon of icons){
		commands+=`<g transform="translate(0,${nbicon*(h+gap)})">
		<text font-family="system-ui" font-weight="normal" font-style="normal" font-size="13" x="25" y="15"
     fill="black">
     ${icon.name}
    </text>
	<image  xlink:href="${icon.icon}" witdh="20" height="20" x="0" y="0"/>
	</g>
	`
	nbicon++;
	}

	return commands + "</svg>"
}




export function generateCommandHTML(jsonpath:string):string {
    const Status_Settings:Objsetting=vscode.workspace.getConfiguration('bomarkdown').get('satus')||{};
    const MandatoryDefs_Settings:Objsetting=vscode.workspace.getConfiguration('bomarkdown').get('MandatoryDefs')||{};
    const bubbules_Settings:Objsetting=vscode.workspace.getConfiguration('bomarkdown').get('bubbules')||{};
    const gap: number=vscode.workspace.getConfiguration('bomarkdown').get('gap')||2;
    let comandhtml:string=`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
* {
  box-sizing: border-box;
}

/* Create two unequal columns that floats next to each other */
.column {
  float: left;
  padding: 10px;
  }

.left {
  width: 50%;
}

.right {
  width: 50%;
}

/* Clear floats after the columns */
.row:after {
  content: "";
  display: table;
  clear: both;
}
</style>
<title>BOM markdown commands</title>
</head>
<body>
<h2>Bom Markdown Commands</h2>    
<div class="row">
  <div class="column left" >
    <h3>Icons</h3>




`;
    
    comandhtml+=getBOMCommandsB64(jsonpath);

    comandhtml+=`
  </div>
  <div class="column right" >
    <h3>Mandatory Defs</h3>
    <svg width="50%" height="${2*(h+gap)}px" style="background-color:white" xmlns="http://www.w3.org/2000/svg" version="1.1" xmlns:xlink="http://www.w3.org/1999/xlink">
    ${MandatoryDefs_Settings["undef"]}
    <text font-family="system-ui" font-weight="normal" font-style="normal" font-size="13" x="${iconw+gap}" y="15"
				fill="black">
				Undef
				</text>			
    </svg>
    `;

    comandhtml+=`<h3>Satus Defs</h3>
    ${generateSVGforSetting(Status_Settings,gap,"",true)}
    `;
    comandhtml+=`<h3>Bulle Defs</h3>
    ${generateSVGforSetting(bubbules_Settings,gap+3,MandatoryDefs_Settings["placeholder"],true)}
    `;


    
    // fermeture des DIV
    comandhtml+="</svg></div></div></body></html>";
    return comandhtml;

}

function generateSVGforSetting (obj:Objsetting,gap:number,includesvg?:string,svgheader?:boolean):string{
    let comandhtml:string="";
    if (svgheader){
    comandhtml=`<svg width="50%" height="${Object.keys(obj).length*(h+2*gap)+gap}px" style="background-color:white" xmlns="http://www.w3.org/2000/svg" version="1.1" xmlns:xlink="http://www.w3.org/1999/xlink">
    `;
    }
    let nbkey:number=0;
    for (let key in obj){
        comandhtml+=`<g transform="translate(15,${gap+nbkey*(h+2*gap)})">
        ${includesvg}
        ${obj[key]}
        <text font-family="system-ui" font-weight="normal" font-style="normal" font-size="13" x="${iconw+gap}" y="15" fill="black">
				${key}
				</text>
                
        </g>`;
        nbkey ++; 
    }
    return comandhtml+ "</svg>"
}

function ExtractDefFromObject (obj:Objsetting):string{
    let comandhtml:string="";
    for (let key in obj){
        comandhtml+=`${obj[key]}
        `;
         }
    return comandhtml
}


export function generateSVG(contexturi:vscode.Uri ,BOMtable:BOM[]):string{
    const gap: number=vscode.workspace.getConfiguration('bomarkdown').get('gap')||2;
    const SVGdefs:string=vscode.workspace.getConfiguration('bomarkdown').get('defs')||"";
    const Status_Settings:Objsetting=vscode.workspace.getConfiguration('bomarkdown').get('satus')||{};
    const MandatoryDefs_Settings:Objsetting=vscode.workspace.getConfiguration('bomarkdown').get('MandatoryDefs')||{};
    const bubbules_Settings:Objsetting=vscode.workspace.getConfiguration('bomarkdown').get('bubbules')||{};
	let tempfinItem:number=0;
	let statusbkgnd:string="";
	let totalh:number=400;
	let JsonUri =vscode.Uri.joinPath(contexturi,"src/IconConfig","UserIcons.json")
	let rawdata = fs.readFileSync(JsonUri.fsPath,"utf-8");
	let icons:Icon[] = JSON.parse(rawdata);
	// calcul de la taille du graph
	// pourquoi un at(-1) fait du undefined ?
	const totalw=BOMtable[BOMtable.length-1].x + BOMtable[BOMtable.length-1].maxw;
	const maxitem= Math.max(...BOMtable.map((maxitem)=>maxitem.BoMItems.length),0);

	// Init du svg et ouverture des <def>
	let tempstr:string=`<svg width="${totalw+10}" height="${maxitem*(h+panv)+2*h}" style="background-color:white" xmlns="http://www.w3.org/2000/svg" version="1.1" xmlns:xlink="http://www.w3.org/1999/xlink">
	<defs>
	`;
    // recuperation des def des settings
	tempstr+=ExtractDefFromObject(MandatoryDefs_Settings);
    tempstr+=ExtractDefFromObject(Status_Settings);
    tempstr+=ExtractDefFromObject(bubbules_Settings);


	// extraction des différents type pour le mettre dans le def du svg
	let listtype:string[]=[];
	for (const bom of BOMtable) {
		let listtypperbom=bom.BoMItems.map(item=> item.Type).filter((value,index,self)=>self.indexOf(value) ===index);
		listtype=listtype.concat(listtypperbom);
	}
	let UniqueType:string[]=listtype.filter((value,index,array)=>array.indexOf(value)===index);
	extlog.appendLine("liste des types :"+UniqueType.join(","));

	// creation d'un def pour chaque type
	for (const typ of UniqueType){
		const typeicon =icons.find(i =>i.name==typ);
		if (typeicon !==undefined){
			tempstr+=`<image  id="${typ}" xlink:href="${typeicon.icon}" witdh="${h}" height="${h}" x="0" y="0"/>
			`;
		} 

	}
	
	// Fermeture des <def>
	tempstr+=`</defs> 
	`;


	for (const iBOM of BOMtable){
		for (const BoMItem of iBOM.BoMItems){
			// construction des lien parent / enfant on le fait en premier pour avoir les bulles sur les liens
			if (BoMItem.Parentid>=0){
				const papa: BoMItem|undefined=iBOM.BoMItems.find(B => B.id===BoMItem.Parentid);
				if (papa !==undefined){
					tempstr+=`<polyline fill="none" stroke="black" stroke-width="1" points="${papa.x+iBOM.x+h/2},${papa.y+iBOM.y+papa.h} ${papa.x+iBOM.x+h/2},${BoMItem.y+iBOM.y+BoMItem.h/2} ${BoMItem.x+iBOM.x},${BoMItem.y+iBOM.y+BoMItem.h/2}"/>
					`;
				}
			}
			// contruction des liens d'implément
			if (BoMItem.relatives){
				
				for (const relative of BoMItem.relatives){
					let tempImpLink:Implink=JSON.parse(EmptyLink);
					// Boucle sur toutes les bom
					for (const bom of BOMtable){
					let relbomitem: BoMItem|undefined=bom.BoMItems.find( R=>R.alias===relative);
					if (relbomitem!==undefined){
						if (bom.column==iBOM.column){
							// meme colonne 
							// attention piege le w est deja un x/ length
							tempImpLink.spx=iBOM.x+BoMItem.w+gap;
							tempImpLink.spy=iBOM.y+BoMItem.y+h/2;
							tempImpLink.fpx=bom.x+relbomitem.w+gap;
							tempImpLink.fpy=bom.y+relbomitem.y+h/2;
							tempImpLink.cs=bend/2;
							tempImpLink.cf=bend/2;


						} else if (bom.column<iBOM.column){
							// cible a gauche
							// attention piege le w est deja un x/ length
							tempImpLink.spx=iBOM.x+BoMItem.x-panh;
							tempImpLink.spy=iBOM.y+BoMItem.y+h/2;
							tempImpLink.fpx=bom.x+relbomitem.w+gap;
							tempImpLink.fpy=bom.y+relbomitem.y+h/2;
							tempImpLink.cs=-bend;
							tempImpLink.cf=bend;

						} else{
							// cible à droite
							// attention piege le w est deja un x/ length
							tempImpLink.spx=iBOM.x+BoMItem.w+gap;
							tempImpLink.spy=iBOM.y+BoMItem.y+h/2;
							tempImpLink.fpx=bom.x+relbomitem.x-panh;
							tempImpLink.fpy=bom.y+relbomitem.y+h/2;
							tempImpLink.cs=bend;
							tempImpLink.cf=-bend;
						}
						tempstr+=`<path fill="none" stroke="${implementlinkcolor}" d="M ${tempImpLink.spx} ${tempImpLink.spy} C ${tempImpLink.spx+tempImpLink.cs} ${tempImpLink.spy} ${tempImpLink.fpx+tempImpLink.cf} ${tempImpLink.fpy} ${tempImpLink.fpx} ${tempImpLink.fpy}" marker-end="url(#arrow)"/>
						`;
					}
				}
				}
			}


			// Constrution du group avec le label
			tempstr+=`
			<g id="${BoMItem.id}" transform="translate(${BoMItem.x+iBOM.x},${BoMItem.y})">
			`;
			// test de presence d'un type et de sa validite
			if (BoMItem.Type){
				const typeicon :any|undefined=icons.find(i =>i.name==BoMItem.Type);
				// on fait de la place pour l'icone si il y a un type
				tempstr+=`<text id="${"L_"+BoMItem.id}" font-family="system-ui" font-weight="normal" font-style="normal" font-size="13" x="${iconw+gap}" y="15"
				fill="black">
				${BoMItem.Label}
				</text>
				`;
                // il y a 2 gap ici car un entre l'icon et le texte et un autre apres
				tempfinItem=BoMItem.lblw+iconw+2*gap;
                // insertion de l'icone via un def
				if (typeicon !==undefined){
                    tempstr+=`<use  href="#${BoMItem.Type}" x="0" y="0"/>
					`;
				} else{
					tempstr+=`<use href="#undef" x="0" y="0"/>
					`;
				}
				
			} else {
				// si pas de type pas d'icone
				tempstr+=`<text id="${"L_"+BoMItem.id}" font-family="system-ui" font-weight="normal" font-style="normal" font-size="13" x="2" y="15"
				fill="black">
				${BoMItem.Label}
				</text>
				`;

				tempfinItem=BoMItem.lblw+gap;
			}

			// rendu de l'effectivité
			if (BoMItem.effectivity){
				if (BoMItem.effectivity=="o"){
					tempstr+=`<use href="#eff" x="0" y="0"/>
					`;
				} else {
					tempstr+=`<text id="${"e_"+BoMItem.id}" font-family="system-ui" text-anchor="end" font-weight="normal" font-style="normal" font-size="13" x="${-panh}" y="15" fill="black" >
    				${BoMItem.effectivity}
    				</text>
					`;
				}
				}
			// traimetment des bulles
			if(BoMItem.bubbles){
				for (const b of BoMItem.bubbles){
					tempstr+=`<use href="#${b}" x="0" y="0"/>
					`;
				}
			}
			// revision
			if (BoMItem.revision){
				tempstr+=`<rect x="${tempfinItem}" y="1" width="${iconw-2}" height="${h-2}" fill="${revbackground}" rx="${h/5}"/>
				<text font-family="system-ui" textLength="${h-5}" dominant-baseline="middle" text-anchor="middle" font-weight="bold" font-style="normal" font-size="10" x="${tempfinItem+iconw/2}" y="${h/2+1}" fill="${revfontcolor}" >
				${BoMItem.revision} 
				</text>
				`;
				tempfinItem+=iconw+gap;
			}
			// status
			if (BoMItem.status){
				tempstr+=`<use href="#${BoMItem.status}" x="${tempfinItem}" />
				`;
				//tempstr+=`<rect x="${tempfinItem}" y="1" width="${h-2}" height="${h-2}" fill="${statusbkgnd}" rx="${h/5}"/>
				//<text font-family="system-ui" dominant-baseline="middle" text-anchor="middle" font-weight="bold" font-style="normal" font-size="10" x="${tempfinItem+h/2}" y="${h/2+1}" fill="white" >
				//${BoMItem.status} 
				//</text>
				//`;

				tempfinItem+=iconw+gap;

				// debug du graph
				//tempstr+=`<text font-family="system-ui" font-weight="bold" font-style="normal" font-size="12" x="${tempfinItem}" y="${h}" fill="red" >
				//${tempfinItem} 
				//</text>
				//`;
				
			}
				
			// fermeture du groupe
			tempstr+=`</g>
			`;

		}
	}
	return tempstr + '</svg>'
}

