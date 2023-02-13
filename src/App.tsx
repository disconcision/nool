import { Component, createEffect,createRenderEffect  } from 'solid-js';
import { createSignal, For, Show } from 'solid-js';
import { createStore } from 'solid-js/store';
import logo from './assets/nooltext6.png'
import {Exp, comp, atom, depth, transform, TransformResult, p_var, p_const, p_comp, p_comp_id, p_const_id, p_var_id} from './Tree';
import Flipping from 'flipping/src/adapters/web';

let exp1:Exp = comp([
  atom('➕'),
  atom('🌕'),
  comp([
    atom('➕'),
    comp([
      atom('✖️'),
      atom('🌘'),
      atom('🌕')]),
    atom('🌘')])]);

let exp:Exp = comp([
      atom('➕'),
      atom('👾'),
      comp([
        atom('➕'),
        atom('🦷'),
        atom('🍄')])]);


const NodeC: Component<{node: Exp, is_head: boolean, parent_id: number}> = (props) => {
  switch(props.node.t) {
    case 'Atom':
      return ( //TODO: random hack below 
      //data-flip-parent={`flip-${props.node.id}`} 
        <Show when={props.is_head} 
        fallback={<div data-flip-key={`flip-${props.node.id}`} class='node atom'>{props.node.sym}</div>}
        >
          <div class='head'>{props.node.sym}</div>
        </Show>
        
      );
    case 'Comp':
      return ( //data-flip-key={`flip-${props.node.id}`} 
        <div data-flip-key2={`flip-${props.node.id}`} class={`node comp`}>
           <NodeC node={props.node.kids[0]} is_head={true} parent_id={props.node.id}/>
          <div style={`position: relative; display:flex; flex-direction:${depth(props.node)<2?'row':'column'};`}>
          <For each={props.node.kids.slice(1)}>
            {kid => <NodeC node={kid} is_head={false} parent_id={props.node.id}/>}
          </For>
          </div>
        </div>
      );
  }
};

const commute_root = (exp:Exp):TransformResult => transform(
  exp,
  p_comp_id(-2,[p_const_id(-3,'➕'), p_var('a'), p_var('b')]),
  p_comp_id(-2,[p_const_id(-3,'➕'), p_var('b'), p_var('a')]));

const assoc_root = (exp:Exp):TransformResult =>{
  let a = p_var('a');
  let b = p_var('b');
  let c = p_var('c');
  return transform(
    exp,
    p_comp_id(-2,[p_const_id(-3, '➕'), a, p_comp_id(-4,[p_const_id(-5,'➕'), b, c])]),
    p_comp_id(-2, [p_const_id(-3, '➕'), p_comp_id(-4,[p_const_id(-5,'➕'), a, b]), c]))};

const assoc_root_rev = (exp:Exp):TransformResult => {
  let a = p_var('a');
  let b = p_var('b');
  let c = p_var('c');
  return transform(
    exp,
    p_comp_id(-2,[p_const_id(-3,'➕'), p_comp_id(-4,[p_const_id(-5,'➕'), a, b]), c]),
    p_comp_id(-2,[p_const_id(-3,'➕'), a, p_comp_id(-4,[p_const_id(-5,'➕'), b, c])]))};
      
const identity_add = (exp:Exp):TransformResult => {
  let a = p_var('a');
  return transform(
    exp,
    p_comp([p_const('➕'), p_const('🌕'), p_var('a')]),
    p_var('a'))};

const identity_add_rev = (exp:Exp):TransformResult =>{
  let a = p_var('a');
  return transform(
      exp,
      p_var('a'),
      p_comp([p_const('➕'), p_const('🌕'), p_var('a')]))};

const App: Component = () => {
  type Task = {
    id: string
    text: string
    completed: boolean
  }

  const [node, setNode] = createSignal(exp);
  
  const flipping = new Flipping({
    duration: 175,
    //stagger: 1,
    //selector:  (_el:Element) => {return [_el]},
    //parent: this,
    attribute: 'data-flip-key',
    //activeSelector: (_el:any) => {return (true)},
  });

  const flipping2 = new Flipping({
    duration: 250,
    easing:'cubic-bezier(0.68, -0.6, 0.32, 1.6)',
    //stagger: 10,
    //selector:  (_el:Element) => {return [_el]},
    //parent: this,
    attribute: 'data-flip-key2',
    //activeSelector: (_el:any) => {return (true)},
  });

  const assocNode = (e: Event) => {
    //e.preventDefault()
    let result = assoc_root(node());
    if (result=='NoMatch') result = assoc_root_rev(node());
    //flipping.read();
    if (result!='NoMatch') setNode(result);
  };

  const commNode = (e: Event) => {
    let result = commute_root(node());
    //flipping.read();
    if (result!='NoMatch') setNode(result);
  };
  
  const transformNode = (f:(_:Exp)=>TransformResult) =>(e: Event) => {
    let result = f(node());
    flipping.read();flipping2.read();
    if (result!='NoMatch') {setNode(result); flipping2.flip();flipping.flip(); }
  };

  createEffect(() => {
    console.log('call effect;flipping.flip %s',node());
    //flipping.flip();
  });

  return (
    <div id='main'>
      <img src={logo} class='logo' />
      <div class='tbuts'>
        <div class='tbut' onclick= {transformNode(commute_root)}>comm</div>
        <div class='tbut' onclick= {transformNode(assoc_root)}>ass1</div>
        <div class='tbut' onclick= {transformNode(assoc_root_rev)}>ass2</div>
        <div class='tbut' onclick= {transformNode(identity_add)}>id1</div>
        <div class='tbut' onclick= {transformNode(identity_add_rev)}>id2</div>
      </div>
      <div class='node-container' onclick = {commNode}>
        {NodeC({node: node(), is_head: false, parent_id:-1})}
      </div> 
    </div>
  )
}

export default App

  /*const [taskList, setTaskList] = createStore([] as Task[])

  /*const addTask= (e: Event) => {
    e.preventDefault()
    const taskInput= document.querySelector('#taskInput') as HTMLInputElement
    const newTask: Task = {
      id: Math.random().toString(36).substring(2),
      text: taskInput.value,
      completed: false
    }
    setTaskList([newTask, ...taskList])
    taskInput.value = ''
  }

  const deleteTask = (taskId:string) => {
    setTaskList(taskList.filter(task => task.id != taskId))
  }

  const toggleStatus = (taskId: string) => {
    setTaskList(
      task => task.id ===taskId,
      'completed',
      completed => !completed)
  }*/