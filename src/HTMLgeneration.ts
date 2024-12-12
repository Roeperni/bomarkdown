import * as vscode from 'vscode';
import * as fs from 'fs';
import {Icon,BOM,Implink,BoMItem,extlog,Objsetting,BOMdata,blocdelim} from "./extension";
import {ComputeBBOXjson} from "./Computelayout";
import {ReplacewithObject, Transcoder} from "./parseEditor"

type legenditem ={
		type:string;
		name:string;
		label:string;
		w:number;
}

type legendColumn ={
		x:number;
		w:number;
		items:legenditem[];
}

type legendtable ={
	w:number;
	h:number;
	columns:legendColumn[];
}


interface Linksdefinitions {
	[key:string]:Linksdefinition

}
interface Linksdefinition {
	label:"string";
	arrow:"string";
	Color: "string";
	thickness:number;
	dashpattern:"string";
}

interface legend {
	types:string[];
	links:string[];
}

const EmptyLink: string='{"spx":0,"spy":0,"fpx":0,"fpy":0,"cf":0,"cs":0}'
const revbackground= vscode.workspace.getConfiguration('bomarkdown').get('revision.background');
const revfontcolor= vscode.workspace.getConfiguration('bomarkdown').get('revision.font');



function getBOMCommandsB64(jsonpath:string):string{
    const gap: number=vscode.workspace.getConfiguration('bomarkdown').get('gap')||2;
	const h:number=vscode.workspace.getConfiguration('bomarkdown').get('h')||20;
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



// Function to generate the HTML of the command BOM Command
export function generateCommandHTML(jsonpath:string):string {
    const Status_Settings:Objsetting=vscode.workspace.getConfiguration('bomarkdown').get('satus')||{};
    const MandatoryDefs_Settings:Objsetting=vscode.workspace.getConfiguration('bomarkdown').get('MandatoryDefs')||{};
    const bubbles_Settings:Objsetting=vscode.workspace.getConfiguration('bomarkdown').get('bubbles')||{};
    const gap: number=vscode.workspace.getConfiguration('bomarkdown').get('gap')||2;
	const linkstyle:Linksdefinitions=vscode.workspace.getConfiguration('bomarkdown').get('Linksdefinition')||{};
	const h:number=vscode.workspace.getConfiguration('bomarkdown').get('h')||20;
	const blocdelim: blocdelim=vscode.workspace.getConfiguration('bomarkdown').get('codeblockdelimiter')||{"begin":"","end":""};
	const iconw:number=h;

    let comandhtml:string=`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
* {
  box-sizing: border-box;
}
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
	<h3>Block delimiter</h3>
	<table>
  <tr>
    <th>begin</th>
    <th>end</th>
  </tr>
	`;
	const tablebegin=blocdelim.begin.split(" ");
	const tablefin=blocdelim.end.split(" ")
	for (let i=0;i<tablebegin.length;i++){
		comandhtml+=`<tr>
			<td><code> ${ReplacewithObject({"<":"&lt;",">":"&gt;"},tablebegin[i])} </code> </td>
			<td> <code> ${ReplacewithObject({"<":"&lt;",">":"&gt;"},tablefin[i])}</code></td>
		</tr>`
	}
	comandhtml+=`
	</table>
    <h3>Icons</h3>
`;
    
    comandhtml+=getBOMCommandsB64(jsonpath);

    comandhtml+=`
  </div>
  <div class="column right" >
    <h3>Mandatory Defs</h3>
    <svg width="50%" height="${h+2*gap}px" style="background-color:white" xmlns="http://www.w3.org/2000/svg" version="1.1" xmlns:xlink="http://www.w3.org/1999/xlink">
    ${MandatoryDefs_Settings["undef"]}
    <text font-family="system-ui" font-weight="normal" font-style="normal" font-size="13" x="${iconw+gap}" y="15"
				fill="black">
				Undef
				</text>			
    </svg>
    `;
	comandhtml+=`<h3>Links</h3>
    ${generateSVGforLinks(linkstyle,gap,true)}
    `;

    comandhtml+=`<h3>Satus Defs</h3>
    ${generateSVGforSetting(Status_Settings,gap,"",true)}
    `;
    comandhtml+=`<h3>Bulle Defs</h3>
    ${generateSVGforSetting(bubbles_Settings,gap+3,MandatoryDefs_Settings["placeholder"],true)}
    `;


    
    // fermeture des DIV
    comandhtml+="</svg></div></div></body></html>";
    return comandhtml;

}

function generateSVGforSetting (obj:Objsetting,gap:number,includesvg?:string,svgheader?:boolean):string{
	const h:number=vscode.workspace.getConfiguration('bomarkdown').get('h')||20;
	const iconw:number=h;
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

function generateSVGforLinks (obj:Linksdefinitions,gap:number,svgheader?:boolean):string{
	const h:number=vscode.workspace.getConfiguration('bomarkdown').get('h')||20;
	const iconw:number=h;
    let comandhtml:string="";
    if (svgheader){
    comandhtml=`<svg width="50%" height="${Object.keys(obj).length*(h+2*gap)+gap}px" style="background-color:white" xmlns="http://www.w3.org/2000/svg" version="1.1" xmlns:xlink="http://www.w3.org/1999/xlink">
    `;
    }
    let nbkey:number=0;
	comandhtml+=`<defs>
	${Extractarrows(obj)}
	</defs>`;
    for (let key in obj){
        comandhtml+=`<g transform="translate(15,${gap+nbkey*(h+2*gap)})">
        <line x1="0" y1="${h/2}" x2="${iconw}" y2="${h/2}" ${lineproperties(obj[key],key)} stroke-linecap="round"/>
        <text font-family="system-ui" font-weight="normal" font-style="normal" font-size="13" x="${iconw+gap}" y="15" fill="black">
				${key} : ${obj[key].label}
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

function Extractarrows (linkstyle:Linksdefinitions):string {
	let comandhtml:string="";
	for (let key in linkstyle){
		if (linkstyle[key].arrow){
		comandhtml+=`${linkstyle[key].arrow}
        `;}
	}
	return comandhtml
}

function lineproperties (link:Linksdefinition,key:string):string {
	let templineprop:string=`stroke="${link.Color}" stroke-width="${link.thickness}"`;
	if (link.dashpattern){templineprop+=' stroke-dasharray="'+link.dashpattern +'"'};
	if (link.arrow){templineprop+=' marker-end="url(#arrow_'+key +')"'};
	return templineprop;

}

function legendextract (BOMtable:BOM[]):legend {
	
	let templegend:legend={types:[],links:[]};
	for (const BOM of BOMtable){
		for( const item of BOM.BoMItems){
			if (!templegend.types.includes(item.Type)){templegend.types.push(item.Type)}
			if (item.relatives){
				for (const rel of item.relatives){
					if (!templegend.links.includes(rel.linktype)){templegend.links.push(rel.linktype)}
				}
			}
		}
	}
	return templegend;
}

function initlegendbloc (legend:legend,nbcol:number,icons:Icon[]):legendtable{
	const linkstyle:Linksdefinitions=vscode.workspace.getConfiguration('bomarkdown').get('Linksdefinition')||{};
	const h:number=vscode.workspace.getConfiguration('bomarkdown').get('h')||20;
	const panv:number=vscode.workspace.getConfiguration('bomarkdown').get('panv')||20;
	const iconw:number=h;
	const gap: number=vscode.workspace.getConfiguration('bomarkdown').get('gap')||2;
	const panh:number=vscode.workspace.getConfiguration('bomarkdown').get('panh')||20;

	let templegend:legendtable;
	let templegenditems:legenditem[]=[];
	let templabel:string="";
	let tempcolumns:legendColumn[];
	for (const typ of legend.types ){
		const typeicon :any|undefined=icons.find(i =>i.name==typ);
		if (typeicon){
			if (typeicon.label){
				templabel=typeicon.label;
			}else {
				templabel=typeicon.name;
			}
			templegenditems.push({type:"object",name:typ,label:templabel,w:ComputeBBOXjson("system-ui",12,templabel)+iconw+gap})
		}
	}
	for (const typ of legend.links ){
			if (typ in linkstyle){
			if (linkstyle[typ].label){
				templabel=linkstyle[typ].label;
			}else {
				templabel=typ;
			}
			

			templegenditems.push({type:"link",name:typ,label:templabel,w:ComputeBBOXjson("system-ui",12,templabel)+iconw+gap})
		}
		}
	const itempercolum:number=Math.ceil(templegenditems.length/nbcol);
	tempcolumns=[];
	for (let k=0;k<nbcol;k++){
		let tempcolumnitems=templegenditems.slice(k*(itempercolum),(k+1)*(itempercolum))
		let tempcolumn:legendColumn={x:0,w:0,items:[]};
		if (k==0){
			tempcolumn.x=0;
		}else{
			tempcolumn.x=tempcolumns[k-1].x + tempcolumns[k-1].w;
		}
		tempcolumn.w=Math.max(...tempcolumnitems.map(w =>w.w))+panh;
		tempcolumn.items=tempcolumnitems;
		tempcolumns.push(tempcolumn)
	}

	const tempw:number=tempcolumns[nbcol-1].x + tempcolumns[nbcol-1].w;

	templegend={w:tempw,h:(itempercolum)*(h+panv),columns:tempcolumns};



	return templegend;
}



export function generateSVG(contexturi:vscode.Uri ,BOMdata:BOMdata):string{
	const h:number=vscode.workspace.getConfiguration('bomarkdown').get('h')||20;
	const panh:number=vscode.workspace.getConfiguration('bomarkdown').get('panh')||20;
	const panv:number=vscode.workspace.getConfiguration('bomarkdown').get('panv')||20;
	const iconw:number=h;
    const gap: number=vscode.workspace.getConfiguration('bomarkdown').get('gap')||2;
    const Status_Settings:Objsetting=vscode.workspace.getConfiguration('bomarkdown').get('satus')||{};
    const MandatoryDefs_Settings:Objsetting=vscode.workspace.getConfiguration('bomarkdown').get('MandatoryDefs')||{};
    const bubbles_Settings:Objsetting=vscode.workspace.getConfiguration('bomarkdown').get('bubbles')||{};
	const BendFactor :number=vscode.workspace.getConfiguration('bomarkdown').get('bend')||1;
	const linkstyle:Linksdefinitions=vscode.workspace.getConfiguration('bomarkdown').get('Linksdefinition')||{};
	let haslegend:boolean=vscode.workspace.getConfiguration('bomarkdown').get('renderlegend')||true;
	let verbose:boolean=false;
	const legendscale:number=vscode.workspace.getConfiguration('bomarkdown').get('legendscale')||0.7;
	if ("haslegend" in BOMdata.params){
		haslegend=BOMdata.params.haslegend;
	}

	let tempfinItem:number=0;
	let JsonUri =vscode.Uri.joinPath(contexturi,"IconConfig","UserIcons.json")
	let rawdata = fs.readFileSync(JsonUri.fsPath,"utf-8");
	let icons:Icon[] = JSON.parse(rawdata);
	if ("verbose" in BOMdata.params){extlog.appendLine('Icon charged');}
	// calcul de la taille du graph
	// pourquoi un at(-1) fait du undefined ?
	const totalw=BOMdata.BOMs[BOMdata.BOMs.length-1].x + BOMdata.BOMs[BOMdata.BOMs.length-1].maxw;
	const maxitem= Math.max(...BOMdata.BOMs.map((maxitem)=>maxitem.BoMItems.length),0);
	
	// extraction de la legende
	const legende:legend=legendextract(BOMdata.BOMs);
	const legendColumns:number=BOMdata.BOMs.length;
	let legendeblock:legendtable=initlegendbloc(legende,legendColumns,icons);
	let svgh:number;
	if (haslegend){
		svgh=maxitem*(h+panv)+3*panv+legendeblock.h + 16;
	} else {
		svgh=maxitem*(h+panv)+2*panv;
	}
	if ("verbose" in BOMdata.params){extlog.appendLine('legend computed');}
	// Init du svg et ouverture des <def>
	let tempstr:string=`<svg width="${totalw+panh}" height="${ svgh }" style="background-color:white" xmlns="http://www.w3.org/2000/svg" version="1.1" xmlns:xlink="http://www.w3.org/1999/xlink">
	<defs>
	`;
    // recuperation des def des settings
	tempstr+=Extractarrows(linkstyle);
	tempstr+=ExtractDefFromObject(MandatoryDefs_Settings);
    tempstr+=ExtractDefFromObject(Status_Settings);
    tempstr+=ExtractDefFromObject(bubbles_Settings);


	// extraction des différents type pour le mettre dans le def du svg
	let listtype:string[]=[];
	for (const bom of BOMdata.BOMs) {
		let listtypperbom=bom.BoMItems.map(item=> item.Type).filter((value,index,self)=>self.indexOf(value) ===index);
		listtype=listtype.concat(listtypperbom);
	}
	let UniqueType:string[]=listtype.filter((value,index,array)=>array.indexOf(value)===index);
	extlog.appendLine("liste des types : "+UniqueType.join(","));

	// creation d'un def pour chaque type
	for (const typ of UniqueType){
		const typeicon =icons.find(i =>i.name==typ);
		if (typeicon !==undefined){
			tempstr+=`<image  id="${typ}" witdh="${h}" height="${h}" x="0" y="0" preserveAspectRatio="xMinYMid" xlink:href="${typeicon.icon}"/>
			`;
		} 

	}
	
	// Fermeture des <def>
	tempstr+=`</defs> 
	`;
	if ("verbose" in BOMdata.params){extlog.appendLine('Def defined');}
// creation de la legende
if (haslegend){
	tempstr+=`<g id="legend" transform="translate(${gap},${maxitem*(h+panv)+2*panv}) scale(${legendscale},${legendscale})">
	<rect width="${legendeblock.w + gap}" height="${legendeblock.h + panv+8}" x="0" y="12" fill="none" stroke="gray" stroke-width="1"/>
	<g transform="translate(5,${panv+h})">		
	`;
	for (const c of legendeblock.columns){
		let nbi:number=0;
		for (const i of c.items) {
			if (i.type=="object"){
			tempstr+=`<use  href="#${i.name}" x="${c.x}" y="${nbi*(h+panv)}"/>
			`;
			} else {
			tempstr+=`<line x1="${c.x}" y1="${nbi*(h+panv)+h/2}" x2="${c.x+iconw}" y2="${nbi*(h+panv)+h/2}" ${lineproperties(linkstyle[i.name],i.name)} stroke-linecap="round"/>
			`;
			}
			tempstr+=`<text font-family="system-ui" font-weight="normal" font-style="normal" font-size="12" x="${c.x+iconw+gap}" y="${nbi*(h+panv)+15}" fill="black">
					${i.label}
					</text>`;
			nbi++;

		}
	}
	tempstr+=`</g>
	<rect x="18" y="10" width="45" height="5" fill="white"/>
	<text stroke="none" font-family="system-ui" font-weight="normal" font-style="normal" font-size="12" x="20" y="16" fill="grey" >
	Legend
	</text></g>`;
	if ("verbose" in BOMdata.params){extlog.appendLine('legend inserted');}
}


// première boucle pour la creation des liens
	for (const iBOM of BOMdata.BOMs){
		for (const BoMItem of iBOM.BoMItems){
			// construction des lien parent / enfant on le fait en premier pour avoir les bulles sur les liens
			if (BoMItem.Parentid>=0){
				const papa: BoMItem|undefined=iBOM.BoMItems.find(B => B.id===BoMItem.Parentid);
				if (papa !==undefined){
					tempstr+=`<polyline fill="none" ${lineproperties(linkstyle["h"],"h")} points="${papa.x+iBOM.x+h/2},${papa.y+iBOM.y+papa.h} ${papa.x+iBOM.x+h/2},${BoMItem.y+iBOM.y+BoMItem.h/2} ${BoMItem.x+iBOM.x},${BoMItem.y+iBOM.y+BoMItem.h/2}"/>
					`;
				}
			}
			// contruction des liens d'implément
			if (BoMItem.relatives){
				
				for (const relative of BoMItem.relatives){
					// test if the linktype is known
					if (relative.linktype in linkstyle) {
					let tempImpLink:Implink=JSON.parse(EmptyLink);
					// Boucle sur toutes les bom
					for (const bom of BOMdata.BOMs){
					let relbomitem: BoMItem|undefined=bom.BoMItems.find( R=>R.alias===relative.relative);
					if (relbomitem!==undefined){
						if (bom.column==iBOM.column){
							// meme colonne 
							// attention piege le w le x du bord droit de l'item
							tempImpLink.spx=iBOM.x+BoMItem.w+gap;
							tempImpLink.spy=iBOM.y+BoMItem.y+h/2;
							tempImpLink.fpx=bom.x+relbomitem.w+gap;
							tempImpLink.fpy=bom.y+relbomitem.y+h/2;
							tempImpLink.cs=(iBOM.maxw-BoMItem.w)*BendFactor+ panh;
							tempImpLink.cf=(iBOM.maxw-relbomitem.w)*BendFactor + panh ;


						} else if (bom.column<iBOM.column){
							// cible a gauche
							// attention piege le w le x du bord droit de l'item
							tempImpLink.spx=iBOM.x+BoMItem.x-panh/2;
							tempImpLink.spy=iBOM.y+BoMItem.y+h/2;
							tempImpLink.fpx=bom.x+relbomitem.w+gap;
							tempImpLink.fpy=bom.y+relbomitem.y+h/2;
							tempImpLink.cs=-(tempImpLink.spx-tempImpLink.fpx)/2;
							tempImpLink.cf=-tempImpLink.cs;

						} else{
							// cible à droite
							// attention piege le w le x du bord droit de l'item
							tempImpLink.spx=iBOM.x+BoMItem.w+gap;
							tempImpLink.spy=iBOM.y+BoMItem.y+h/2;
							tempImpLink.fpx=bom.x+relbomitem.x-panh/2;
							tempImpLink.fpy=bom.y+relbomitem.y+h/2;
							tempImpLink.cs=(tempImpLink.fpx-tempImpLink.spx)/2;
							tempImpLink.cf=-tempImpLink.cs;
						}
						if (relative.linktype in linkstyle){
						tempstr+=`<path fill="none" ${lineproperties(linkstyle[relative.linktype],relative.linktype)} d="M ${tempImpLink.spx} ${tempImpLink.spy} C ${tempImpLink.spx+tempImpLink.cs} ${tempImpLink.spy} ${tempImpLink.fpx+tempImpLink.cf} ${tempImpLink.fpy} ${tempImpLink.fpx} ${tempImpLink.fpy}"/>
						`;
					}
				}
				}
				}
			}




		}
		if ("verbose" in BOMdata.params){extlog.appendLine('Relationned');}
	}
// Deuxieme boucle pour la creation des items au dessus des liens
	for (const iBOM of BOMdata.BOMs){
		for (const BoMItem of iBOM.BoMItems){
			// Constrution du group avec le label
			tempstr+=`
			<g id="${BoMItem.id}" transform="translate(${BoMItem.x+iBOM.x},${BoMItem.y+iBOM.y})">
			`;
			// test de presence d'un type et de sa validite
			if (BoMItem.Type){
				const typeicon :any|undefined=icons.find(i =>i.name==BoMItem.Type);
				// on fait de la place pour l'icone si il y a un type
				tempstr+=`<rect width="${BoMItem.lblw}" height="${h}" x="${iconw+gap}" fill="url(#grad)" />
				<text id="${"L_"+BoMItem.id}" font-family="system-ui" font-weight="normal" font-style="normal" font-size="13" x="${iconw+gap}" y="15" stroke="white" stroke-width="0.25" fill="black" paint-order="stroke">
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
				tempstr+=`<rect width="${BoMItem.lblw}" height="${h}" x="${gap}" fill="url(#grad)" />
				<text id="${"L_"+BoMItem.id}" font-family="system-ui" font-weight="normal" font-style="normal" font-size="13" x="${gap}" y="15" stroke="white" stroke-width="1" fill="black" paint-order="stroke">
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
					tempstr+=`<text id="${"e_"+BoMItem.id}" font-family="system-ui" text-anchor="end" font-weight="normal" font-style="normal" font-size="13" x="${-panh}" y="15" fill="black" paint-order="stroke">
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
		if ("verbose" in BOMdata.params){extlog.appendLine('itemed');}
	}

	return tempstr + '</svg>'
}

