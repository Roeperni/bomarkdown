// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

import { Computelayout } from './Computelayout';
import { parseEditor } from './parseEditor';
import { generateCommandHTML , generateSVG} from './HTMLgeneration';



const h:number=vscode.workspace.getConfiguration('bomarkdown').get('h')||20;
const panh:number=vscode.workspace.getConfiguration('bomarkdown').get('panh')||20;
const iconw:number=h;



// courbure des lien d'implement
export const bend:number=100;
export let extlog=vscode.window.createOutputChannel("BoMarkdownLogs");
//Define Item interface

export type link={
	relative:string;
	linktype:string;
}

export interface BoMItem {
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
	lblw:number;
	effw?:number;
	effectivity?:string;
	status?:string;
	revision?:string;
	bubbles?:string[];
	relatives?:link[];
	badparsing:boolean;


}
export interface BOM {
	BoMItems:BoMItem[];
	column:number;
	x:number;
	y:number;
	maxw:number;
	maxnegw:number;
	h:number;

}


export interface Implink {
	spx:number;
	spy:number;
	fpx:number;
	fpy:number;
	cf:number;
	cs:number;
}


type blocdelim ={
	"begin":string;
	"end" : string;
}

export interface Icon {

	"name": string;
    "icon": string;
    "type": string;
	"label"?:string;
}

interface BoMBLock{
	"path":string;
	"content":string;
	"begin":number;
	"end":number
}

export const EmptyBoMItem: string= '{"id":0,"Parentid":0,"level":0,"Label":"","badparsing":false,"x":0,"y":0,"h":0,"lblw":0,"w":0,"Type":""}'
export const EmptyBoM: string='{"BoMItems":[],"column":0,"x":0,"y":0,"maxw":0,"maxnegw":0,"h":0}'


function getBomBlock (line:number,editortext:string):BoMBLock{

	// Split de l'editor sur les saut de ligne
	let EditorArray: string[] = editortext.split(/\r?\n/);
	const blocdelim: blocdelim=vscode.workspace.getConfiguration('bomarkdown').get('codeblockdelimiter')||{"begin":"","end":""};
	const beginbloc=blocdelim.begin.split(" ");
	const endbloc=blocdelim.end.split(" ");
	// recherche de la limite sup du codeblock
	let i=0;
	let beginline=0;
	let temppath:string[]=[];
	for (i=line; i>=0; i--){
		//console.log("Ligne:" + EditorArray[i] + " Bloc:" + beginbloc[0]);
		if (beginbloc.some(bloc =>EditorArray[i].startsWith(bloc))) {
			temppath=EditorArray[i].split(":");
			//console.log("trouvé debut");
			beginline=i+1;
			break;

		}
		}
	
	for (i=line; i<EditorArray.length; i++){
		console.log(endbloc.toString())
		if (endbloc.some(fbloc =>EditorArray[i].startsWith(fbloc))) {
			console.log("trouvé fin");
			break;
		}
		}
	const endline=i;
	const tempblock:BoMBLock={"path":temppath[1],"content":EditorArray.slice(beginline,endline).join("\n"),"begin":beginline,"end":endline};
	return tempblock;
}

function createsvgfile (uri:vscode.Uri,path:string,txtsvg:string):void{
	
	if (uri.scheme !="untitled"){
		if (path){
			uri=vscode.Uri.joinPath(uri,"../"+path +".svg");
		}	else {
			
			uri=uri.with({path:uri.path.substring(0,uri.path.lastIndexOf("."))+".svg"});
		}
		vscode.workspace.fs.writeFile(uri,Buffer.from(txtsvg,"utf-8"));
		vscode.window.showInformationMessage('File created : '+ uri.toString());
	} else {
		vscode.window.showInformationMessage('File is not saved no svg creation');
	}
}



// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "bomarkdown" is now active!');
	
	context.subscriptions.push(
		vscode.commands.registerCommand('bomarkdown.preview', () => {

		  let Editor=vscode.window.activeTextEditor
		  let line=vscode.window.activeTextEditor?.selection.active.line
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
		let temptxtbloc=getBomBlock(Editor.selection.active.line,Editor.document.getText());	
		panel.webview.html=getpreviewhtml(context.extensionUri,panel.webview,temptxtbloc.content);
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
			let temptxtbloc=getBomBlock(Editor.selection.active.line,Editor.document.getText())
			let BOMtable:BOM[]= parseEditor(temptxtbloc.content);
			BOMtable=Computelayout(BOMtable);
			const txtsvg:string=generateSVG(context.extensionUri,BOMtable);
			
			createsvgfile(Editor.document.uri,temptxtbloc.path,txtsvg);

		  }
		})
	  );
	  context.subscriptions.push(
		vscode.commands.registerCommand('bomarkdown.insertassvg', () => {

		  let Editor=vscode.window.activeTextEditor
		  if (Editor ===undefined) {
			vscode.window.showInformationMessage('No Active editor');
		  } else {
			// Export to file
			const editortext=Editor.document.getText();
			let temptxtbloc=getBomBlock(Editor.selection.active.line,editortext);
			let BOMtable:BOM[]= parseEditor(temptxtbloc.content);
			BOMtable=Computelayout(BOMtable);
			const txtsvg:string=generateSVG(context.extensionUri,BOMtable);
			createsvgfile(Editor.document.uri,temptxtbloc.path,txtsvg);
			const temposition:vscode.Position=new vscode.Position(temptxtbloc.end+1,0);
			const tempSVGmd=`![${temptxtbloc.path}](${temptxtbloc.path +".svg"} "${temptxtbloc.path}")`;
			if (!editortext.includes(tempSVGmd)){
			Editor.edit(editbuilder=> {
				editbuilder.insert(temposition,"\n"+tempSVGmd+"\n");
							
			});
			}
			vscode.commands.executeCommand('markdown-preview-enhanced.openPreviewToTheSide');
			
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
			let JsonUri =vscode.Uri.joinPath(context.extensionUri,"src/IconConfig","UserIcons.json");
			let jsonpath=JsonUri.fsPath;		
			panel.webview.html=generateCommandHTML(jsonpath); 
			
		  
		})
	  );

	  context.subscriptions.push(
		vscode.commands.registerCommand('bomarkdown.addicons', () => {

			// option for the folder picker
			const options: vscode.OpenDialogOptions = {
				canSelectMany: false,
				openLabel: 'Select',
				canSelectFiles: false,
				canSelectFolders: true
			};
			// uri for the file
			let JsonUri =vscode.Uri.joinPath(context.extensionUri,"src/IconConfig","UserIcons.json");
			// convertion of the uri in path
			let jsonpath=JsonUri.fsPath;
			// read json and convert to object
			let rawdata = fs.readFileSync(jsonpath,"utf-8");
			let icons:Icon[] = JSON.parse(rawdata);
			extlog.appendLine("Json Location :"+jsonpath);
			
			// diplay of the file dialog
			vscode.window.showOpenDialog(options).then(fileUri => {
			   if (fileUri && fileUri[0]) {
				extlog.appendLine("liste des types :"+fileUri[0].fsPath);
				// read the folder
				const IconFiles=fs.readdirSync(fileUri[0].fsPath)
				for (const Iconfile of IconFiles){
					// extension detection
					const spitIconfile=Iconfile.split(".")
					if (spitIconfile[1].toLowerCase()=="jpg" || spitIconfile[1].toLowerCase()=="png"|| spitIconfile[1].toLowerCase()=="jpeg"){
					const Iconindex =icons.findIndex(i =>i.name==spitIconfile[0]);
					extlog.appendLine(fileUri[0].fsPath + " | " +Iconfile);
					extlog.appendLine(path.join(fileUri[0].fsPath,Iconfile));
					// converstion of the file in B64
					const tempB64=fs.readFileSync(path.join(fileUri[0].fsPath,Iconfile), { encoding: 'base64' });
					
					if (Iconindex > -1){
						// If the icon is already in the index udate the image
						extlog.appendLine("Update :"+spitIconfile[0]);
						icons[Iconindex].type=spitIconfile[1].toLowerCase();
						icons[Iconindex].icon=`data:image/${spitIconfile[1]};base64,${tempB64}`;

					} else {
						// new file add to index
							let tempicon :Icon={
							name:spitIconfile[0].toLowerCase(),
							type:spitIconfile[1].toLowerCase(),
							icon:`data:image/${spitIconfile[1]};base64,${tempB64}`

						};
						extlog.appendLine("Add :"+spitIconfile[0]);
						icons.push(tempicon)
					}
				}
				}
				// save the object in the json
				let rawdata2 = JSON.stringify(icons, null, 2);
				fs.writeFileSync(jsonpath, rawdata2);
				// display the new icons
				const panel = vscode.window.createWebviewPanel(
					'bomcommands', // Identifies the type of the webview. Used internally
					'BoM Markdown Updated Commands', // Title of the panel displayed to the user
					vscode.ViewColumn.Two, // Editor column to show the new webview panel in.
					{} // Webview options. More on these later.
					);	
				panel.webview.html=generateCommandHTML(jsonpath); 


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
		vscode.window.showInformationMessage('Hello les guys');
	});

	context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}




// function that generates the preview html
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
<h1>SVG</h1>
${generateSVG(contexturi,BOMtable)}
<h1>Json</h1>
<pre>
<code>
${JSON.stringify(BOMtable,null,"\t")}
</pre>
</code>
<pre>
${EditorTxt}
</pre>
</body>
</html>`;
}