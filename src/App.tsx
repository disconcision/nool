import { Component, createEffect,createRenderEffect  } from 'solid-js';
import { createSignal, For, Show } from 'solid-js';
import { createStore } from 'solid-js/store';
import logo from './assets/nooltext7.png'
import toolbarbkg from './assets/ps-toolbar.png'
import {Exp, Pat, comp, atom, depth, transform, transform_at_id, TransformResult, p_var, p_const, p_comp, p_comp_id, p_const_id, p_var_id} from './Tree';
import Flipping from 'flipping/src/adapters/web';

type Model =
{
  stage: Exp,
  selectPath: number[],
  selectId: number,
};

type Transform  = {
  name: string,
  source: Pat,
  result: Pat,
};

type Inject = (_: Action) => void;

type Action =
| {t: 'transformNode', f:(_:Exp)=>TransformResult}
| {t: 'setSelect', id:number};

const flipping = new Flipping({
  duration: 175, //175,
  //stagger: 1,
  //selector:  (_el:Element) => {return [_el]},
  //parent: this,
  attribute: 'data-flip-key',
  //activeSelector: (_el:any) => {return (true)},
});

const flipping2 = new Flipping({
  duration: 250, //250,
  easing: 'cubic-bezier(0.68, -0.6, 0.32, 1.6)',
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
        setModel(model);
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
  selectId: -1,
};

const NodeC: Component<{node: Exp, model:Model, animate: boolean, is_head: boolean, parent_id: number, depth: number, inject: Inject}> = (props) => {
  const setSelect = (id:number) =>
    (e:Event) => {
      e.preventDefault();
      e.stopPropagation();
      props.inject({t: 'setSelect', id})
    };
  const is_selected = props.node.id == props.model.selectId;
  switch(props.node.t) {
    case 'Atom':
      var opts:any = {};
      if(props.animate) { opts[`data-flip-key`] =`flip-${props.node.id}` };
      return ( //TODO: random hack below 
      //data-flip-parent={`flip-${node.id}`} 
        <Show when={props.is_head} 
        fallback={
          <div
            /*data-flip-key={`flip-${props.node.id}`}*/
            {...opts}
            class={`node atom ${is_selected?'selected':''}`}
            onclick={setSelect(props.node.id)}
            >
            {props.node.sym}
          </div>}
        >
          <div class='head' {...opts}>{props.node.sym}</div>
        </Show>
        
      );
    case 'Comp':
      var opts:any = {};
      if(props.animate) { opts[`data-flip-key-comp`] =`flip-${props.node.id}` };
      return ( //data-flip-key={`flip-${node.id}`} 
      // flex-direction:${depth(props.node)<2?'row':'column'};
        <div
          data-flip-parent={`flip-${props.node.id}`}
          {...opts}
          class={`node comp ${is_selected?'selected':''}`}
          onclick={setSelect(props.node.id)}
          >
           <NodeC
            model={props.model}
            node={props.node.kids[0]}
            animate={props.animate}
            is_head={true}
            parent_id={props.node.id}
            depth={props.depth + 1}
            inject={props.inject} />
          <div style={`position: relative; display:flex; flex-direction: column;`}>
          <For each={props.node.kids.slice(1)}>
            {kid =>
              <NodeC
                model={props.model}
                node={kid}
                animate={props.animate}
                is_head={false}
                parent_id={props.node.id}
                depth={props.depth + 1}
                inject={props.inject} />}
          </For>
          </div>
        </div>
      );
  }
};

const PatView: Component<{p: Pat, is_head: boolean}> = (props) => {
  switch(props.p.t) {
    case 'Atom': {
      const sym = props.p.sym.name;
      switch(props.p.sym.t) {
        case 'Var': return <div class={(sym + ' ' + (props.is_head?'head pat':'node atom pat'))}>{sym}</div>;
        case 'Const': return <div class={(sym + ' ' + (props.is_head?'head pat':'node atom pat'))}>{sym}</div>;}}
    case 'Comp': return (
    <div class='node comp pat' style={`position: relative; display:flex; flex-direction: column;`}>
      {PatView({p:props.p.kids[0], is_head:true})}
      <For each={props.p.kids.slice(1)}>
        {kid => PatView({p:kid, is_head:false})}
      </For>
    </div>);
  }
};

const var_a = p_var('✿');
const var_b = p_var('♫');
const var_c = p_var('♥');
const plus_1 = p_const_id(-3, '➕');
const plus_x = (a: Pat,b: Pat) => p_comp_id(-4, [p_const_id(-5, '➕'), a, b])
const plus_y = (a: Pat,b: Pat) => p_comp_id(-2, [p_const_id(-3, '➕'), a, b])

const commute_root: Transform = {
  name: 'comm',
  source: p_comp_id(-2,[plus_1, var_a, var_b]),
  result:p_comp_id(-2,[plus_1, var_b, var_a])
};

const assoc_root: Transform = {
  name: 'ass',
  source: plus_y(var_a, plus_x(var_b, var_c)),
  result: plus_y(plus_x(var_a, var_b), var_c)
};

const assoc_root_rev: Transform = {
  name: 'ass⇦',
  source: plus_y(plus_x(var_a, var_b), var_c),
  result: plus_y(var_a, plus_x(var_b, var_c))
};
      
const identity_add: Transform = {
  name: 'id',
  source: var_a,
  result: p_comp([p_const('➕'), p_const('0️⃣'), var_a])
};

const identity_add_rev: Transform = {
  name: 'id⇦',
  source: p_comp([p_const('➕'), p_const('0️⃣'), var_a]),
  result: var_a
};

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

const do_at = ({source, result}: Transform, id:number) => (exp:Exp):TransformResult =>
  transform_at_id(exp, source, result, id);

const do_reverse_at = ({source, result}: Transform, id:number) => (exp:Exp):TransformResult =>
  transform_at_id(exp, result, source, id);

const Preview: Component<{node: Exp, f: Transform, indicated: number, inject: Inject}> = (props) => {
  const transform = (f:(_:Exp) => TransformResult) => (_:Event) => props.inject({t: 'transformNode', f});
  let node = do_at(props.f, props.indicated)(props.node);
  //HACK: init_model
  return(
  <div
    class='node-container'
    style={(node == 'NoMatch')?'display: none':''}
    onclick={evt => {console.log('yo'); transform(do_at(props.f, props.indicated))(evt)}}
    >
    {(node == 'NoMatch')? <div></div> : NodeC({model:init_model, node, animate:false, is_head: false, parent_id:-1, depth:0, inject:_=>{}})}
  </div>)
};

const AdjacentPossible: Component<{model: Model, inject: Inject}> = (props) => {
  let transforms = [commute_root, assoc_root, assoc_root_rev, identity_add, identity_add_rev];
  //TODO: BUG: instead of -1, check if selection is actually in tree
  return(
    <div class='previews'
    style={props.model.selectId == -1 ? 'display:none':'display: flex; flex-direction: column; gap: 2em; font-size: 0.5em; padding: 2.3em;'}>
      <For each={transforms}>{transform =>
        Preview({node:props.model.stage, f:transform, indicated:props.model.selectId, inject:_=>{}})
      }</For>
    </div>)
};

const Stage: Component<{model: Model, inject:(_: Action) => void}> = (props) => {
  console.log('rendering stage. selectId is', props.model.selectId);
  return(
    <div id='stage'>
      <div id='debug' style='display:none'>
        <div>selectId: {props.model.selectId}</div>
      </div>
      <div class='node-container'>
        {NodeC({model:props.model, node: props.model.stage, animate: true,is_head: false, parent_id:-1, depth:0, inject:props.inject})}
        {AdjacentPossible({model: props.model, inject:props.inject})}
      </div> 
    </div>
  )
};

// arrows: → ⇋ ⥊ ⥋ ⇋ ⇌ ⇆ ⇄ ⇐ ⇒ ⟸ ⟹ ⟺ ⟷ ⬄ ↔ ⬌ ⟵ ⟶ ← → ⬅ ⇦ ⇨ ➥ ➫ ➬
const Button: Component<{t: Transform, id: number, inject:(_: Action) => void}> = (props) => {
  //const transform = (f:(_:Exp) => TransformResult) => (_:Event) => props.inject({t: 'transformNode', f});
  return(<div class='tbut' onclick={(e:Event) => 
    {e.preventDefault();
    e.stopPropagation();
    props.inject({t: 'transformNode', f:(do_at(props.t, props.id))})}
    }>
    <div>{props.t.name}</div>
    <div class='transform'>
      <div>
        <PatView p={props.t.source} is_head={false} />
      </div>
      <div class='transform-arrow'>⇋</div> 
      <div onclick={(e:Event) => {
        e.preventDefault();
        e.stopPropagation();
        props.inject({t: 'transformNode', f:(do_reverse_at(props.t, props.id))})}
    }>
        <PatView p={props.t.result} is_head={false} />
      </div>
    </div>
  </div>)
};

const Buttons: Component<{model: Model, inject:(_: Action) => void}> = (props) => {
  const transform = (f:(_:Exp) => TransformResult) => (_:Event) => props.inject({t: 'transformNode', f});
  /*const trans_or = (f:(_:Exp)=>TransformResult,g:(_:Exp)=>TransformResult) => (e: Exp) =>
   {
    let result = f(e);
    if (result=='NoMatch') return g(e);
    return result;
  };*/
  return(
    <div class='tbuts'>
      {Button({t: commute_root, id: props.model.selectId, inject:props.inject})}
      {Button({t: assoc_root, id: props.model.selectId, inject:props.inject})}
      {/*Button({t: assoc_root_rev, id: props.model.selectId, inject:props.inject})*/}
      {Button({t: identity_add, id: props.model.selectId, inject:props.inject})}
      {/*Button({t: identity_add_rev, id: props.model.selectId, inject:props.inject})*/}
    </div>
  )
};
      
const Toolbar: Component<{model: Model, inject:Inject}> = (props) => {
return (
  <div id='toolbar' style={`background-image: url(${toolbarbkg})`}>
    .
  </div>
)};
const App: Component = () => {
  const [model, setModel] = createSignal(init_model);
  let inject = (a:Action) => {update(model(), setModel, a);};
  return (
    <div id='main'>
      <div class='logo' />
      {Toolbar({model: model(), inject})}
      {Buttons({model: model(), inject})}
      {Stage({model: model(),inject})}
    </div>
  )
}

export default App
