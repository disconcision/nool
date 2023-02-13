import { Component, createEffect,createRenderEffect  } from 'solid-js';
import { createSignal, For, Show } from 'solid-js';
import { createStore } from 'solid-js/store';
import logo from './assets/nooltext6.png'
import {Exp, comp, atom, depth, transform, TransformResult, p_var, p_const, p_comp} from './Tree';
import Flipping from 'flipping/src/adapters/web';

let exp:Exp = comp([
  atom('➕'),
  atom('🌕'),
  comp([
    atom('➕'),
    comp([
      atom('✖️'),
      atom('🌘'),
      atom('🌕')]),
    atom('🌘')])]);


const NodeC: Component<{node: Exp, parity: boolean}> = (props) => {
  switch(props.node.t) {
    case 'Atom':
      return (
        <div data-flip-key={`flip-${props.node.id}`} class={`${props.parity?'head':'node atom'}`}>{props.node.sym}</div>
      );
    case 'Comp':
      return (
        <div data-flip-key={`flip-${props.node.id}`} class={`node comp`}>
           <NodeC node={props.node.kids[0]} parity={true}/>
          {/*(props.node.kids[0]).sym*/}
          <div style={`display:flex; flex-direction:${depth(props.node)<2?'row':'column'};`}>
          <For each={props.node.kids.slice(1)}>
            {kid => <NodeC node={kid} parity={false}/>}
          </For>
          </div>
        </div>
      );
  }
};

const commute_root = (exp:Exp):TransformResult =>
transform(
  exp,
  p_comp([p_const('➕'), p_var('a'), p_var('b')]),
  p_comp([p_const('➕'), p_var('b'), p_var('a')]));

const assoc_root = (exp:Exp):TransformResult =>
  transform(
    exp,
    p_comp([p_const('➕'), p_var('a'), p_comp([p_const('➕'), p_var('b'), p_var('c')])]),
    p_comp([p_const('➕'), p_comp([p_const('➕'), p_var('a'), p_var('b')]), p_var('c')]));

const assoc_root_rev = (exp:Exp):TransformResult =>
  transform(
    exp,
    p_comp([p_const('➕'), p_comp([p_const('➕'), p_var('a'), p_var('b')]), p_var('c')]),
    p_comp([p_const('➕'), p_var('a'), p_comp([p_const('➕'), p_var('b'), p_var('c')])]));
      
const identity_add = (exp:Exp):TransformResult =>
  transform(
    exp,
    p_comp([p_const('➕'), p_var('🌕'), p_var("a")]),
    p_comp([p_const('➕'), p_var('a')]));

const App: Component = () => {
  type Task = {
    id: string
    text: string
    completed: boolean
  }

  const [node, setNode] = createSignal(exp);
  
  const flipping = new Flipping({
    duration: 250,
    //parent: this,
    //attribute: 'data-flip-key',
    //activeSelector: (_el:any) => {return (true)},
  });

  const assocNode = (e: Event) => {
    //e.preventDefault()
    let result = assoc_root(node());
    if (result=='NoMatch') result = assoc_root_rev(node());
    flipping.read();
    if (result!='NoMatch') setNode(result);
  };

  const commNode = (e: Event) => {
    let result = commute_root(node());
    flipping.read();
    if (result!='NoMatch') setNode(result);
  };

  createEffect(() => {
    console.log('call effect;flipping.flip %s',node());
    flipping.flip();
  });

  return (
    <div id='main'>
      <img src={logo} alt='nool text' style='width: 8em; margin: 3em' />
      <div class='node-container' onclick = {commNode}>
        {NodeC({node: node(), parity: false})}
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