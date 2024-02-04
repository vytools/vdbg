import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { request } from 'http';
// import { request } from 'https';

interface VyNodule {
	_id: string;
	name: string;
	devContainer: Object;
}

interface VyGroup {
	_id: string;
	name: string;
	nodules: VyNodule[];
}

export class VyToolsProvider implements vscode.TreeDataProvider<GroupDependency | NoduleDependency> {

	private _onDidChangeTreeData: vscode.EventEmitter<GroupDependency | NoduleDependency | undefined | void> = new vscode.EventEmitter<GroupDependency | NoduleDependency | undefined | void>();
	readonly onDidChangeTreeData: vscode.Event<GroupDependency | NoduleDependency| undefined | void> = this._onDidChangeTreeData.event;
	private _vyGroupsPath: string = '';
	constructor(private readonly extensionUri: vscode.Uri) {
		this._vyGroupsPath = vscode.Uri.joinPath(extensionUri,'vy_groups').fsPath;
	}

	refresh_group(group_id: string | undefined) {
		if (!group_id) return;
		let vgp = this._vyGroupsPath;
		let odctd = this._onDidChangeTreeData;
		let req = request(`http://localhost/group_nodules/${group_id}`,{},(res) => {
			let body = "";
			res.setEncoding('utf8');
			res.on("data", (chunk) => { body += chunk; });
			res.on("end", () => {
				try {
					let group = JSON.parse(body);
					if (group && group._id) {
						let pth = path.join(vgp, `${group._id}.json`);
						fs.writeFileSync(pth, JSON.stringify(group,null,2));
						odctd.fire();				
					}
				} catch (error) {
					vscode.window.showErrorMessage(`Failed to add/refresh ${group_id}: ${error}`);
				};
			});
		});
		req.end();
	}
	
	async add_group() {
		const group_id = await vscode.window.showInputBox({
			placeHolder: "group_id",
			prompt: "Enter the group id from vy.tools"
		});
		this.refresh_group(group_id);
	}
	
	getTreeItem(element: GroupDependency | NoduleDependency): vscode.TreeItem {
		vscode.window.showInformationMessage(`getTreeItem ${JSON.stringify(element)}.`)
		return element;
	}

	getChildren(element?: GroupDependency | NoduleDependency): Thenable<GroupDependency[] | NoduleDependency[]> {
		if (element) {
			if (element.contextValue == 'vy_group' && 'nodules' in element.obj) {
				vscode.window.showInformationMessage(`vy_group ${JSON.stringify(element.obj.nodules)}.`);
				return Promise.resolve(element.obj.nodules.map((nodule:VyNodule) => new NoduleDependency(nodule)));
			} else {
				return Promise.resolve([]);
			}
		} else { // Top level
			let dir = this._vyGroupsPath;
			let groups:Array<VyGroup> = [];
			try {
				fs.readdirSync(dir).forEach(function(file: string) {
					const pth = path.join(dir,file);
					const stat = fs.statSync(pth);
					if (stat.isFile() && pth.endsWith('.json')) {
						groups.push(JSON.parse(fs.readFileSync(pth, 'utf-8')));
					}
				});
			} catch (err) {
			}
			return Promise.resolve(groups.map(group => new GroupDependency(group)));
		}
	}
}

export class NoduleDependency extends vscode.TreeItem {
	constructor(public readonly obj: VyNodule) {
		super(obj.name, vscode.TreeItemCollapsibleState.None);
		this.command = {
			command: 'vyToolsGroups.openNodule',
			title: `Open ${obj.name}`,
			arguments: [obj.devContainer]
		}
		this.tooltip = `Launch "${obj.name}" Nodule in a container`;
	}
	contextValue = 'vy_nodule';
}

export class GroupDependency extends vscode.TreeItem {
	constructor(public readonly obj: VyGroup) {
		super(obj.name, vscode.TreeItemCollapsibleState.Collapsed);
		this.tooltip = `"${obj.name}" Group`;
	}
	contextValue = 'vy_group';
}
