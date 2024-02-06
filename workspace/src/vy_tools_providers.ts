import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { request, get } from 'http';
import * as zlib from 'zlib';
const AdmZip = require('adm-zip');
// import { request } from 'https';

interface VyNodule {
	_id: string;
	name: string;
	vsczp: string;
	devContainer: object;
}

interface VyGroup {
	_id: string;
	name: string;
	nodules: VyNodule[];
}

export class VyToolsProvider implements vscode.TreeDataProvider<GroupDependency | NoduleDependency> {

	private _onDidChangeTreeData: vscode.EventEmitter<GroupDependency | NoduleDependency | undefined | void> = new vscode.EventEmitter<GroupDependency | NoduleDependency | undefined | void>();
	readonly onDidChangeTreeData: vscode.Event<GroupDependency | NoduleDependency| undefined | void> = this._onDidChangeTreeData.event;
	constructor(private readonly _vyGroupsPath: string) {
	}

	download_all_zips(group:VyGroup) {
		let gpth = this._vyGroupsPath;
		group.nodules.forEach(nodule => {
			const outputPath = path.join(gpth,nodule.name);
			try {
				fs.accessSync(outputPath);
			} catch(err) {
				const outputFile = path.join(gpth,nodule.name+'.zip');
				const req = request(nodule.vsczp, {}, (response) => {
					const isCompressed = response.headers['content-encoding'] === 'gzip' || response.headers['content-encoding'] === 'deflate';
					const fileStream = fs.createWriteStream(outputFile);
					const downloadStream = isCompressed ? response.pipe(zlib.createUnzip()) : response;
					downloadStream.pipe(fileStream);
					fileStream.on('finish', () => {
						const zip = new AdmZip(outputFile);
						zip.extractAllTo(outputPath, /*overwrite*/ true);
						fs.unlinkSync(outputFile)
					});
				});
				req.on('error', (err) => {
					vscode.window.showErrorMessage(`Error downloading the zip file for nodule ${nodule.name}: ${err.message}`);
				});
				req.on('end', () => {});
				req.end();
			}
		});
	}

	refresh_group(group_id: string | undefined) {
		if (!group_id) return;
		let vgp = this._vyGroupsPath;
		let odctd = this._onDidChangeTreeData;
		const req = request(`http://localhost/group_nodules/${group_id}`,{},(res) => {
			let body = "";
			res.setEncoding('utf8');
			res.on("data", (chunk) => { body += chunk; });
			res.on("end", () => {
				try {
					let group = JSON.parse(body);
					if (group && group._id) {
						let pth = path.join(vgp, 'vy.group.json');
						fs.writeFileSync(pth, JSON.stringify(group,null,2));
						this.download_all_zips(group);
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
		await this.refresh_group(group_id);
	}
	
	getTreeItem(element: GroupDependency | NoduleDependency): vscode.TreeItem {
		// vscode.window.showInformationMessage(`getTreeItem ${JSON.stringify(element)}.`)
		return element;
	}

	getChildren(element?: GroupDependency | NoduleDependency): Thenable<GroupDependency[] | NoduleDependency[]> {
		if (element) {
			if (element.contextValue == 'vy_group' && 'nodules' in element.obj) {
                let pth = this._vyGroupsPath;
				// vscode.window.showInformationMessage(`vy_group ${JSON.stringify(element.obj.nodules)}.`);
				return Promise.resolve(element.obj.nodules.map((nodule:VyNodule) => new NoduleDependency(nodule,path.join(pth,nodule.name))));
			} else {
				return Promise.resolve([]);
			}
		} else { // Top level
			let dir = this._vyGroupsPath;
			let groups:Array<VyGroup> = [];
			try {
				let pth = path.join(dir,'vy.group.json');
				try {
					fs.accessSync(pth);
					const stat = fs.statSync(pth);
					if (stat.isFile()) {
						groups.push(JSON.parse(fs.readFileSync(pth, 'utf-8')));
					}
				} catch(err) {}
			} catch (err) {
			}
			return Promise.resolve(groups.map(group => new GroupDependency(group)));
		}
	}
}

export class NoduleDependency extends vscode.TreeItem {
	constructor(public readonly obj: VyNodule, public readonly nodulePath:string) {
		super(obj.name, vscode.TreeItemCollapsibleState.None);
		this.command = {
			command: 'vyToolsGroups.infoNodule',
			title: `${obj.name} Information`,
			arguments: [obj,nodulePath]
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
