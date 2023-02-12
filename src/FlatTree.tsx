export type Id = number;
export type FlatNode = {t: 'Atom', s: string} | {t: 'Comp', s:string, kids: Id[]};
export type FlatTree = {root: Id|undefined, nodes: FlatNode[]};
import {TNode} from './OldTree';

export let empty: FlatTree = {root:undefined, nodes:[]};

export let update_single = ({root, nodes}: FlatTree, id: Id, f: (_:FlatNode)=>FlatNode): FlatTree => {
    nodes[id] = f(nodes[id]);
    return {root, nodes};
};
