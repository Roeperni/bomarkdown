
import {
  createConnection,
  TextDocuments,
  ProposedFeatures,
  InitializeParams,
  CompletionItem,
  CompletionItemKind,
  TextDocumentPositionParams
} from "vscode-languageserver/node";

import { TextDocument } from "vscode-languageserver-textdocument";

const connection = createConnection(ProposedFeatures.all);
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

connection.onInitialize((_params: InitializeParams) => {
  return {
    capabilities: {
      completionProvider: {
        resolveProvider: false
      }
    }
  };
});

// Ta liste de types
const TYPES = [
  "assembly","chapter","comment","component","file","folder","function","logical",
  "mitem","plant","req","resource","routing","spec","worker","ca","class","co",
  "fbook","lib","mod","mv","pc","pl","cr","var","vvalue","ia","3dshp","book","ci",
  "coremat","cos","covmat","crep","ctx","doc","dp","drw","ep","eps","filter",
  "fpipe","gbn","isr","mei","ope","prd","rpipe","sam","sn","spart","stddoc",
  "image51","swp","swb","cont","generalop","indusdoc","kit","mass","mat","mcell",
  "methodcont","method","prov","routing","tool","workcenter","worker","workerrr"
];

connection.onCompletion(
  (params: TextDocumentPositionParams): CompletionItem[] => {
    const doc = documents.get(params.textDocument.uri);
    if (!doc) return [];

    const text = doc.getText();
    const offset = doc.offsetAt(params.position);
    const before = text.substring(0, offset);

    //
    // 1️⃣ Détection du 1er paramètre (i:type)
    //
    const firstParam = before.match(/\(i:([a-zA-Z0-9_-]*)$/);
    if (firstParam) {
      return TYPES.map(t => ({
        label: t,
        kind: CompletionItemKind.EnumMember,
        insertText: t
      }));
    }

    //
    // 2️⃣ Détection du 2e paramètre → Label
    //
    if (before.match(/\(i:[^,]+,\s*$/)) {
      return [
        { label: "Label", kind: CompletionItemKind.Field, insertText: "Label" }
      ];
    }

    //
    // 3️⃣ Détection du 3e paramètre → Revision (optionnelle)
    //
    if (before.match(/\(i:[^,]+,\s*[^,]+,\s*$/)) {
      return [
        {
          label: "Revision",
          kind: CompletionItemKind.Field,
          insertText: "Revision"
        }
      ];
    }

    return [];
  }
);

documents.listen(connection);
connection.listen();
