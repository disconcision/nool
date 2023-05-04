import { Component, createEffect,createRenderEffect  } from 'solid-js';
import { createSignal, For, Show } from 'solid-js';
import { createStore } from 'solid-js/store';
import logo from './assets/nooltext7.png'
import {Exp, Pat, comp, atom, depth, transform, transform_at_id, TransformResult, p_var, p_const, p_comp, p_comp_id, p_const_id, p_var_id} from './Tree';
import Flipping from 'flipping/src/adapters/web';

type Model =
{
  stage: Exp,
  selectPath: number[],
  selectId: number,
};

type Transform  = [Pat, Pat];

type Action =
| {t: 'transformNode', f:(_:Exp)=>TransformResult}
| {t: 'setSelect', id:number};

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
  attribute: 'data-flip-key-comp',
  //activeSelector: (_el:any) => {return (true)},
});

//TODO: separate effects from functional update somehow
const update = (model: Model, setModel: any, action: Action): Model => {
  switch(action.t) {
    case 'transformNode':
      let result = action.f(model.stage);
      flipping.read();
      flipping2.read();
      if (result!='NoMatch') {
        const m = {...model, stage:result};
        setModel(m);
        flipping2.flip();
        flipping.flip();
        return m;
      } else {
        return model;
      }
    case 'setSelect':
      const m = {...model, selectId:action.id};
      setModel(m);
      return model;
  }
};

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
      atom('🎲'),
      comp([
        atom('➕'),
        atom('🦷'),
        atom('🍄')])]);

let exp2:Exp = comp([
          atom('➕'),
          atom('🐝'),
          comp([
            atom('➕'),
            atom('🌸'),
            atom('🍄')])]);

let init_model = {
  stage: exp,
  selectPath: [],
  selectId: 0,
};

const NodeC: Component<{node: Exp, model:Model, is_head: boolean, parent_id: number, depth: number, inject: (_:Action)=>void}> = (props) => {
  const setSelect = (id:number) =>
    (e:Event) => {e.preventDefault();
      e.stopPropagation();
      props.inject({t: 'setSelect', id})};
  const is_selected = props.node.id ==props.model.selectId;
  switch(props.node.t) {
    case 'Atom':
      var opts:any = {};
      opts[`data-flip-key-${props.depth}`] =`flip-${props.node.id}`;
      return ( //TODO: random hack below 
      //data-flip-parent={`flip-${node.id}`} 
        <Show when={props.is_head} 
        fallback={<div data-flip-key={`flip-${props.node.id}`} /*{...opts}*/ class={`node atom ${is_selected?'selected':''}`} onclick={setSelect(props.node.id)}>{props.node.sym}</div>}
        >
          <div class='head'>{props.node.sym}</div>
        </Show>
        
      );
    case 'Comp':
      var opts:any = {};
      opts[`data-flip-key-${props.depth}`] =`flip-${props.node.id}`;
      return ( //data-flip-key={`flip-${node.id}`} 
        <div
          data-flip-parent={`flip-${props.node.id}`}
          data-flip-key-comp={`flip-${props.node.id}`}
          class={`node comp ${is_selected?'selected':''}`}
          onclick={setSelect(props.node.id)}
          >
           <NodeC model={props.model} node={props.node.kids[0]} is_head={true} parent_id={props.node.id} depth={props.depth+1} inject={props.inject} />
          <div style={`position: relative; display:flex; flex-direction:${depth(props.node)<2?'row':'column'};`}>
          <For each={props.node.kids.slice(1)}>
            {kid => <NodeC model={props.model} node={kid} is_head={false} parent_id={props.node.id} depth={props.depth+1} inject={props.inject} />}
          </For>
          </div>
        </div>
      );
  }
};

const commute_root: Transform = [
  p_comp_id(-2,[p_const_id(-3,'➕'), p_var('a'), p_var('b')]),
  p_comp_id(-2,[p_const_id(-3,'➕'), p_var('b'), p_var('a')])];

const do_at = ([pat, template]: Transform, id:number) => (exp:Exp):TransformResult =>
  transform_at_id(exp, pat, template, id);

const commute_root_at = (id:number)=>(exp:Exp):TransformResult => 
  do_at(commute_root, id)(exp);

const assoc_root: ()=>Transform = () =>{
  let a = p_var('a');
  let b = p_var('b');
  let c = p_var('c');
  return [
    p_comp_id(-2,[p_const_id(-3, '➕'), a, p_comp_id(-4,[p_const_id(-5,'➕'), b, c])]),
    p_comp_id(-2, [p_const_id(-3, '➕'), p_comp_id(-4,[p_const_id(-5,'➕'), a, b]), c])
  ]
  };

const assoc_root_rev: ()=>Transform = () =>{
  let a = p_var('a');
  let b = p_var('b');
  let c = p_var('c');
  return [
    p_comp_id(-2,[p_const_id(-3,'➕'), p_comp_id(-4,[p_const_id(-5,'➕'), a, b]), c]),
    p_comp_id(-2,[p_const_id(-3,'➕'), a, p_comp_id(-4,[p_const_id(-5,'➕'), b, c])])]};
      
const identity_add: Transform = [
    p_comp([p_const('➕'), p_const('🌕'), p_var('a')]),
    p_var('a')
  ];

const identity_add_rev: Transform = [
      p_var('a'),
      p_comp([p_const('➕'), p_const('🌕'), p_var('a')])
    ];


// generate a list of n flippings, with attributes 'data-flip-key-n'
let make_flippings = (n: number): Flipping[] => {
  let result: Flipping[] = [];
  for (let i = 0; i < n; i++) {
    result.push(new Flipping({
      duration: 175,
      attribute: `data-flip-key-${i}`,
    }));
  }
  return result;
};

// call flipping.read on a list of flippings
let read_flippings = (flippings: Flipping[]) => {
  for (let i = 0; i < flippings.length; i++) {
    flippings[i].read();
  }
};

// call flipping.flip on a list of flippings
let flip_flippings = (flippings: Flipping[]) => {
  for (let i = 0; i < flippings.length; i++) {
    flippings[i].flip();
  }
};



const Stage: Component<{model: Model, inject:(_: Action) => void}> = (props) => {
  console.log('rendering stage. selectId is', props.model.selectId);
  return(
    <div id='stage'>
      <div id='debug' style='display:none'>
        <div>selectId: {props.model.selectId}</div>
      </div>
      <div class='node-container'>
        {NodeC({model:props.model, node: props.model.stage, is_head: false, parent_id:-1, depth:0, inject:props.inject})}
      </div> 
    </div>
  )
};

const Buttons: Component<{model: Model, inject:(_: Action) => void}> = (props) => {
  const transform = (f:(_:Exp) => TransformResult) => (_:Event) => props.inject({t: 'transformNode', f});
  const trans_or = (f:(_:Exp)=>TransformResult,g:(_:Exp)=>TransformResult) => (e: Exp) =>
   {
    let result = f(e);
    if (result=='NoMatch') return g(e);
    return result;
  }
  return (<div class='tbuts'>
        <div class='tbut' onclick= {transform(do_at(commute_root, props.model.selectId))}>comm</div>
        <div class='tbut' onclick= {transform(do_at(assoc_root(), props.model.selectId))}>ass⁺</div>
        <div class='tbut' onclick= {transform(do_at(assoc_root_rev(), props.model.selectId))}>ass⁻</div>
        <div class='tbut' onclick= {transform(do_at(identity_add, props.model.selectId))}>id⁻</div>
        <div class='tbut' onclick= {transform(do_at(identity_add_rev, props.model.selectId))}>id⁺</div>
      </div>)
      };
      
const App: Component = () => {
  const [model, setModel] = createSignal(init_model);
  let inject = (a:Action) => {update(model(), setModel, a);};
  return (
    <div id='main'>
      <div class='logo' />
      {Buttons({model: model(), inject})}
      {Stage({model: model(),inject})}
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