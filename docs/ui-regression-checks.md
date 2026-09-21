# Request workspace regression checks

Run `npm run dev` and open the local app. Use sample data; no live API calls are required.

- Paste a JSON document with at least 6,000 lines into a POST request body. Scroll down and edit its final property. Verify the text and caret stay visible, then beautify. Try a long single-line value and horizontal scrolling.
- Enter invalid JSON and click Beautify. Verify an error appears without changing the body.
- Open Tools and paste the same large document into JSON Viewer. Verify the editor stays inside the window and scrolls. Switch to JSON Diff, enter two different objects, and switch back. Verify the viewer input is retained.
- Open eleven request tabs. Verify labels retain their width, the strip scrolls, New tab remains reachable, and the request switcher selects off-screen tabs. Use Left/Right/Home/End while a tab is focused.
- Create an environment and select it in one tab. Switch to a previously opened tab with no environment. Verify its selection remains empty; switch back and verify the first selection returns. Reload and verify persisted selections.
- Modify a new request, switch to another tab, close the modified background tab, and choose Save. Reopen the saved request and verify its method, endpoint and body. Repeat with an already saved request and with a different collection selected.
- Close a tab after changing only its method or headers. Verify the unsaved-changes prompt appears. Cancel must retain the tab; closing the final clean tab must leave a new usable request.

Validated in Chrome during this change: a 108 KB / 6,000-line request body, scrolling and editing its final property; large JSON Viewer scrolling; switching tools without losing input; JSON Diff output; eleven-tab overflow and Home navigation; independent environment selections; and saving new and existing background requests.

## Sidebar context menus

- Right-click the collection selector, a folder, a request, and empty sidebar space; verify the actions match the target.
- Create a folder and a new request inside it. The request must be an empty GET, while “Save current request as…” copies the editor contents.
- Duplicate and rename a request; verify its original remains unchanged. Rename a folder and create a subfolder.
- Focus a sidebar row and press Shift+F10. Navigate using arrows/Home/End, activate with Enter, and dismiss with Escape or an outside click.
- Open a menu near a viewport edge and verify all actions remain visible.
- Delete a request/folder only with disposable data. Cancel must retain it; confirming folder deletion must keep open child requests as unsaved tabs. The final collection cannot be deleted.

## Search and response comparison

- Type a request name, method, or endpoint into the sidebar search. Matching requests remain visible and their parent folders stay expanded; clearing the field restores the full tree.
- With two responses available, verify each response header shows status text, duration, approximate payload size, and header count.
- In Diff View, verify the added/removed counts and use Previous/Next Difference to scroll and highlight each changed line.

## Request options

- Verify the request builder exposes Params, Body, Auth, Headers, Scripts, and Docs tabs.
- Add a query parameter and verify it is encoded into the endpoint and shown in the resolved destination preview.
- Switch Body between No Body, JSON, Plain Text, XML, YAML, GraphQL, Form Data, Form URL Encoded, and File. JSON keeps beautify and syntax highlighting; unsupported execution modes show an explicit status note.
- Select Bearer Token or Basic Auth and verify the generated Authorization header appears in Headers and is sent with the request.
