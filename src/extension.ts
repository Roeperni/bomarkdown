// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';



const h:number=20;
const panh:number=20;
const panv:number=5;
const lettersize=6.2;
const iconw:number=24;
const topoffset:number=0;
const implementlinkcolor:string="steelblue";
const revbackground= vscode.workspace.getConfiguration('bomarkdown').get('revision.background');
const revfontcolor= vscode.workspace.getConfiguration('bomarkdown').get('revision.font');
const bend:number=100;
let extlog=vscode.window.createOutputChannel("BoMarkdownLogs");
//Define Item interface
interface BoMItem {
	id:number;
	Parentid:number;
	level:number;
	Type:string;
	Label:string;
	alias?:string;
	x:number;
	y:number;
	h:number;
	w:number;
	negw?:number;
	effectivity?:string;
	status?:string;
	revision?:string;
	bubbles?:string[];
	relatives?:string[];
	badparsing:boolean;


}
interface BOM {
	BoMItems:BoMItem[];
	column:number;
	x:number;
	y:number;
	maxw:number;
	maxnegw:number;
	h:number;

}
interface Implink {
	spx:number;
	spy:number;
	fpx:number;
	fpy:number;
	cf:number;
	cs:number;
}

interface IconLeg {

	"name": string;
    "icon": string;
    "scale": number;
}


interface Icon {

	"name": string;
    "icon": string;
    "type": string;
}

const EmptyBoMItem: string= '{"id":0,"Parentid":0,"level":0,"Label":"","badparsing":false,"x":0,"y":0,"h":0,"w":0,"Type":""}'
const EmptyBoM: string='{"BoMItems":[],"column":0,"x":0,"y":0,"maxw":0,"maxnegw":0,"h":0}'
const EmptyLink: string='{"spx":0,"spy":0,"fpx":0,"fpy":0,"cf":0,"cs":0}'
// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "bomarkdown" is now active!');
	context.subscriptions.push(
		vscode.commands.registerCommand('bomarkdown.preview', () => {

		  let Editor=vscode.window.activeTextEditor
		  if (Editor ===undefined) {
			vscode.window.showInformationMessage('No Active editor');
		  } else {
			// Create and show a new webview
			const panel = vscode.window.createWebviewPanel(
			'bompreview', // Identifies the type of the webview. Used internally
			'BoM Preview', // Title of the panel displayed to the user
			vscode.ViewColumn.Two, // Editor column to show the new webview panel in.
			{} // Webview options. More on these later.
			);
			panel.webview.html=getpreviewhtml(context.extensionUri,panel.webview,Editor.document.getText());
		  }
		})
	  );
	  context.subscriptions.push(
		vscode.commands.registerCommand('bomarkdown.export', () => {

		  let Editor=vscode.window.activeTextEditor
		  if (Editor ===undefined) {
			vscode.window.showInformationMessage('No Active editor');
		  } else {
			// Export to file
			let BOMtable:BOM[]= parseEditor(Editor.document.getText());
			BOMtable=Computelayout(BOMtable);
			const txtsvg:string=generateSVG(context.extensionUri,BOMtable);
			let activefile=Editor.document.fileName.split(".");
			activefile[activefile.length-1]="svg"
			fs.writeFileSync(activefile.join("."),txtsvg);
		  }
		})
	  );
	context.subscriptions.push(
		vscode.commands.registerCommand('bomarkdown.commands', () => {

		 	// Create and show a new webview
			const panel = vscode.window.createWebviewPanel(
			'bomcommands', // Identifies the type of the webview. Used internally
			'BoM Markdown Commands', // Title of the panel displayed to the user
			vscode.ViewColumn.Two, // Editor column to show the new webview panel in.
			{} // Webview options. More on these later.
			);
			let JsonUri =vscode.Uri.joinPath(context.extensionUri,"src/Media","UserIcons.json");
			let jsonpath=JsonUri.fsPath;
			let comandhtml:string=`<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<title>BOM markdown commands</title>
			</head>
			<body>
								`;
			comandhtml+=getBOMCommandsB64(jsonpath);
			comandhtml+="</body></html>"
				
			panel.webview.html=comandhtml; 
			
		  
		})
	  );

	  context.subscriptions.push(
		vscode.commands.registerCommand('bomarkdown.addicons', () => {

		  	// Create and show a new webview
			//const panel = vscode.window.createWebviewPanel(
			//'addicons', // Identifies the type of the webview. Used internally
			//'BoM Markdown Commands', // Title of the panel displayed to the user
			//vscode.ViewColumn.Two, // Editor column to show the new webview panel in.
			//{} // Webview options. More on these later.
			//);

			const options: vscode.OpenDialogOptions = {
				canSelectMany: false,
				openLabel: 'Select',
				canSelectFiles: false,
				canSelectFolders: true
			};
			
			let JsonUri =vscode.Uri.joinPath(context.extensionUri,"src/Media","UserIcons.json");
			let jsonpath=JsonUri.fsPath;
			let rawdata = fs.readFileSync(jsonpath,"utf-8");
			let icons:Icon[] = JSON.parse(rawdata);
			extlog.appendLine("Json Location :"+jsonpath);

			vscode.window.showOpenDialog(options).then(fileUri => {
			   if (fileUri && fileUri[0]) {
				extlog.appendLine("liste des types :"+fileUri[0].fsPath);
				const IconFiles=fs.readdirSync(fileUri[0].fsPath)
				for (const Iconfile of IconFiles){
					const spitIconfile=Iconfile.split(".")
					if (spitIconfile[1].toLowerCase()=="jpg" || spitIconfile[1].toLowerCase()=="png"|| spitIconfile[1].toLowerCase()=="jpeg"){
					const Iconindex =icons.findIndex(i =>i.name==spitIconfile[0]);
					extlog.appendLine(fileUri[0].fsPath + " | " +Iconfile);
					extlog.appendLine(path.join(fileUri[0].fsPath,Iconfile));
					const tempB64=fs.readFileSync(path.join(fileUri[0].fsPath,Iconfile), { encoding: 'base64' });
					if (Iconindex > -1){
						extlog.appendLine("Ajout :"+spitIconfile[0]);
						icons[Iconindex].type=spitIconfile[1].toLowerCase();
						icons[Iconindex].icon=`data:image/${spitIconfile[1]};base64,${tempB64}`;

					} else {
							let tempicon :Icon={
							name:spitIconfile[0],
							type:spitIconfile[1].toLowerCase(),
							icon:`data:image/${spitIconfile[1]};base64,${tempB64}`

						};
						extlog.appendLine("Update :"+spitIconfile[0]);
						icons.push(tempicon)
					}
				}
				}

				let rawdata2 = JSON.stringify(icons, null, 2);
				fs.writeFileSync(jsonpath, rawdata2);
				const panel = vscode.window.createWebviewPanel(
					'bomcommands', // Identifies the type of the webview. Used internally
					'BoM Markdown Updated Commands', // Title of the panel displayed to the user
					vscode.ViewColumn.Two, // Editor column to show the new webview panel in.
					{} // Webview options. More on these later.
					);
					let comandhtml:string=`<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>BOM markdown commands</title>
</head>
<body>
					`;
					comandhtml+=getBOMCommandsB64(jsonpath);
					comandhtml+="</body></html>"
	
				panel.webview.html=comandhtml; 


			   }
		   });
		   

		  
		})
	  );



	
	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	const disposable = vscode.commands.registerCommand('bomarkdown.helloWorld', () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		vscode.window.showInformationMessage('Hello World from BoMarkdown!');
	});

	context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
// + (e:[modelA -> inf.[)(b:lock,context)(t:Enginneering,Piece1,A.1)(s:R)(PArt2,PArt3, Part12)
export function deactivate() {}

function getBOMCommandsB64(jsonpath:string):string{
	let rawdata = fs.readFileSync(jsonpath,"utf-8");
	let icons:Icon[] = JSON.parse(rawdata);
	let commands:string=`
<h1>
List of icons
</h1>
<p>${jsonpath}</p>
<svg width="400px" height="1200px" style="background-color:white" xmlns="http://www.w3.org/2000/svg" version="1.1" xmlns:xlink="http://www.w3.org/1999/xlink">	
`;
	let nbicon:number=0;
	for (const icon of icons){
		commands+=`<g transform="translate(0,${nbicon*22})">
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




function parseEditor(EditorTxt:string): BOM[] {
// Split de l'editor sur les saut de ligne
	let EditorArray:string[]= EditorTxt.split(/\r?\n/).filter((c:string) =>c!=="");
// init des variable de la fonction
	let tempBOM:BOM=JSON.parse(EmptyBoM);
	let tempid:number=0;
	let BOMtable:BOM[]=[];
	let tempparentid:number[]=[-1];
	let tempcolumn:number=0;
	let tempparentlevel:number=0;
	tempBOM.BoMItems=[];
	
// Boucle sur toutes les ligne de l'editor
	for (const item of EditorArray){

		let tempitem:BoMItem=JSON.parse(EmptyBoMItem)
		// test de la comande new column
		if (item=="+newcolumn"){
			tempBOM.column=tempcolumn;
			BOMtable.push(tempBOM);
			tempBOM=JSON.parse(EmptyBoM)
			tempcolumn ++;
		} else{
		// on detecte le niveau	
		let tempArray:string[]=[];
		tempArray=item.split("+ ");
		// on ignore les ligne qui n'ont pas de +
		if (tempArray.length == 2){
			tempitem.id=tempid;
			let tempargs:string=tempArray[1];
			
//			if (tempArray[0].length>tempparentid.length-1>){
//				tempparentid.push(tempid-1)
//				tempitem.level=tempArray[0].length;
				
			
//			} else{
			// C'est un enfant
				tempitem.level=tempArray[0].length;
				tempitem.Parentid=tempparentid[tempitem.level];
				tempparentid[tempitem.level+1]=tempid
//			}	
			tempArray=[];
			// Parsing du texte a droite des +
			tempArray=tempargs.split(/\(|\)/).filter((c:string) =>c!=="");
			// Block pour sortir en cas d'erreur de parsing
			argparsing: {
			for (const arg of tempArray){
				// test sur les 2 premier char de chaque bloc
				switch (arg.substring(0,2)) {
					case "e:":
						// effectivié
						tempitem.effectivity=arg.substring(2)
						break;
					case "i:":
						// TNR
						const TNRarray=arg.substring(2).split(",")
						switch (TNRarray.length) {
							case 1:
								// si une valeur alors c'est un label
								tempitem.Label=TNRarray[0];
								break;
							case 2:
								// Si 2 valeur c'est Type, Label
								tempitem.Type =TNRarray[0];
								tempitem.Label=TNRarray[1];
								break;
							case 3:
								// si 3 valeur c'est Type label revision
								tempitem.Type =TNRarray[0];
								tempitem.Label=TNRarray[1];
								tempitem.revision=TNRarray[2];
								break;
							default:
								// Si plus de valeurs on dumpe dans le label
								tempitem.Label=arg.substring(2);
						}
						break;
					case "l:":
						// Gesiton des lien et des ALias Alias avant le / liste d'alias en lien apres
							let larray:string[]=[];
							larray=arg.substring(2).split("/");
							if (larray.length>= 1){
								tempitem.alias=larray[0];
							}
							if (larray.length== 2){
								const temprelatives=larray[1].split(",").filter((c:string) =>c!=="");
								if (temprelatives){
									tempitem.relatives=temprelatives;
								}
							}
							
						break;
					case "b:":
						// liste des bulles

							tempitem.bubbles=arg.substring(2).split(",");
					break;
					case "s:":
						// status
						tempitem.status=arg.substring(2);
					break;
					default:
						// Si on n'est pas dans les pattern d'avant
						if (tempArray.length>1){
							// il il y a quand meme des ()
							delete tempitem.revision;
							delete tempitem.alias;
							delete tempitem.relatives;
							delete tempitem.effectivity;
							delete tempitem.status;
							tempitem.badparsing=true;
						}
						// si il n'y a rien on a juste un label
						tempitem.Label=tempargs;
						break argparsing;
						
				

				}

			}
			}
	
			tempBOM.BoMItems.push(tempitem);
		}
	}
			tempid++;
		
	}
	
tempBOM.column=tempcolumn;
BOMtable.push(tempBOM);
return BOMtable;
}

function Computelayout (TBOM:BOM[]):BOM[]{

	for (const iBOM of TBOM){
		// premier scan de toute un bom pour determiner les abcisses de chaque item, la largeur de chaque item

		let itemcount=0;
		for(const BOMitem of iBOM.BoMItems){
			BOMitem.y=itemcount*(h+panv)
			BOMitem.x=BOMitem.level*panh
			//todo le support du multiligne dans la description
			BOMitem.h=h
			BOMitem.w=BOMitem.x+BOMitem.Label.length*lettersize
			if (BOMitem.Type){BOMitem.w+=iconw}
			if (BOMitem.effectivity){
				BOMitem.negw=BOMitem.effectivity.length*lettersize;
				if (BOMitem.negw>iBOM.maxnegw){iBOM.maxnegw=BOMitem.negw}
			}
			if (BOMitem.revision){BOMitem.w+=iconw}
			if (BOMitem.status){BOMitem.w+=iconw}
			if(BOMitem.w>iBOM.maxw){iBOM.maxw=BOMitem.w}
			itemcount++;
		}
		iBOM.y=topoffset;
		iBOM.x=panh+iBOM.maxnegw
		if(iBOM.column>0){
			iBOM.x=iBOM.x+panh+TBOM[iBOM.column-1].x +TBOM[iBOM.column-1].maxw
		}
		
	}
	return TBOM
}

function generateSVG(contexturi:vscode.Uri ,BOMtable:BOM[]):string{
	let tempfinItem:number=0;
	let statusbkgnd:string="";
	let totalh:number=400;
	let JsonUri =vscode.Uri.joinPath(contexturi,"src/Media","UserIcons.json")
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
	tempstr+=vscode.workspace.getConfiguration('bomarkdown').get('defs');



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
		} else{
			tempstr+=`<g id="undef">
			<rect x="0" y="0" width="${h-2}" height="${h-2}" fill="red" rx="${h/5}"/>
			<text font-family="system-ui" dominant-baseline="middle" text-anchor="middle" font-weight="bolder" font-style="normal" font-size="16" x="${h/2}" y="${h/2+1}" fill="white" >
			?  
			</text>
			</g>
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
					//console.log(`<polyline fill="none" stroke="rgb(255, 255, 255)" stroke-width="2" points="${papa.x+iBOM.x},${papa.y+iBOM.y} ${papa.x},${papa.y+panv+papa.h} ${BoMItem.x},${BoMItem.y}"/>`);
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
							tempImpLink.spx=iBOM.x+BoMItem.w+2;
							tempImpLink.spy=iBOM.y+BoMItem.y+h/2;
							tempImpLink.fpx=bom.x+relbomitem.w+2;
							tempImpLink.fpy=bom.y+relbomitem.y+h/2;
							tempImpLink.cs=bend/2;
							tempImpLink.cf=bend/2;


						} else if (bom.column<iBOM.column){
							// cible a gauche
							// attention piege le w est deja un x/ length
							tempImpLink.spx=iBOM.x+BoMItem.x-panh;
							tempImpLink.spy=iBOM.y+BoMItem.y+h/2;
							tempImpLink.fpx=bom.x+relbomitem.w+2;
							tempImpLink.fpy=bom.y+relbomitem.y+h/2;
							tempImpLink.cs=-bend;
							tempImpLink.cf=bend;

						} else{
							// cible à droite
							// attention piege le w est deja un x/ length
							tempImpLink.spx=iBOM.x+BoMItem.w+2;
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
			`
			// test de presence d'un type et de sa validite
			if (BoMItem.Type){
				const typeicon :any|undefined=icons.find(i =>i.name==BoMItem.Type);
				// on fait de la place pour l'icone si il y a un type
				tempstr+=`<text font-family="system-ui" font-weight="normal" font-style="normal" font-size="13" x="${h+2}" y="15"
				fill="black">
				${BoMItem.Label}
				</text>
				`;
				tempfinItem=BoMItem.Label.length*lettersize+h+2
				if (typeicon !==undefined){
					tempstr+=`<use  href="#${BoMItem.Type}" x="0" y="0"/>
					`;
					


				} else{
					tempstr+=`<use href="#undef" x="0" y="0"/>
					`;
				}
				
			} else {
				// si pas de type pas d'icone
				tempstr+=`<text font-family="system-ui" font-weight="normal" font-style="normal" font-size="13" x="2" y="15"
				fill="black">
				${BoMItem.Label}
				</text>
				`;
				tempfinItem=BoMItem.Label.length*lettersize+2
			}

			// rendu de l'effectivité
			if (BoMItem.effectivity){
				if (BoMItem.effectivity=="o"){
					tempstr+=`<use href="#eff" x="0" y="0"/>
					`;
				} else {
					tempstr+=`<text font-family="system-ui" text-anchor="end" font-weight="normal" font-style="normal" font-size="13" x="${-panh}" y="15" fill="black" >
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
				tempstr+=`<rect x="${tempfinItem}" y="1" width="${h-2}" height="${h-2}" fill="${revbackground}" rx="${h/5}"/>
				<text font-family="system-ui" textLength="${h-5}" dominant-baseline="middle" text-anchor="middle" font-weight="bold" font-style="normal" font-size="10" x="${tempfinItem+h/2}" y="${h/2+1}" fill="${revfontcolor}" >
				${BoMItem.revision} 
				</text>
				`;
				tempfinItem+=h+2;
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

				tempfinItem+=h+2;

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


function getpreviewhtml(contexturi:vscode.Uri ,wv: vscode.Webview,EditorTxt:string){

let BOMtable:BOM[]= parseEditor(EditorTxt);
BOMtable=Computelayout(BOMtable);
	return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>BoM Preview</title>
</head>
<body>
<h1>
Original
</h1>
<p>
${EditorTxt.replace(/\r?\n/g,"<br>")}
</p>
<h1>
Json
</h1>
<pre>
<code>
${JSON.stringify(BOMtable,null,"\t")}
</pre>
</code>
<h1>
SVG
</h1>
${generateSVG(contexturi,BOMtable)}
</body>
</html>`;
}