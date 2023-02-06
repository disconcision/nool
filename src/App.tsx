import type { Component } from 'solid-js';
import { createSignal, For, Show } from 'solid-js';
import { createStore } from 'solid-js/store';
import logo from './assets/nooltext.png'
import { Node, comp, atom} from './Node';
import { FlatTree } from './FlatTree';

let guy: FlatTree = {root:0, nodes:[]};

let tree:Node = comp('➕', [atom('🌕'), comp('➕', [comp('✖️', [atom('🌘'), atom('🌕')]), atom('🌘')])]);

let depth = (node: Node):number  => {switch(node.t){
  case 'Atom': return 0;
  case 'Comp': return 1 + Math.max(...node.kids.map(depth));
}};


const NodeC: Component<{node: Node, parity: boolean}> = (props) => {
  switch(props.node.t) {
    case 'Atom':
      return (
        <div class='node atom'>{props.node.s}</div>
      );
    case 'Comp':
      return (
        <div class={`node comp`}>
          {props.node.s}
          <div style={`display:flex; flex-direction:${depth(props.node)<2?'row':'column'};`}>
          <For each={props.node.kids}>
            {kid => <NodeC node={kid} parity={(depth(kid)<2)?!props.parity:props.parity}/>}
          </For>
          </div>
          
        </div>
      );
  }
  
};

const App: Component = () => {
  type Task = {
    id: string
    text: string
    completed: boolean
  }

  const [node, setNode] = createSignal(tree);

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


  return (
    <div id='main'>
      {/*<h1 class="mb-4">nool</h1>*/}
      <img src={logo} alt='nool text' style='width: 8em; margin: 3em' />

      <div class='node-container'>
        {NodeC({node: node(), parity: true})}
      </div>
      

      {/*
      <form class="mb-5 row row-cols-2 justify-content-center" onSubmit={addTask}>
        <input type="text" class="input-group-text p-1 w-25" placeholder="wat do.." id="taskInput" required />

        <button class="btn btn-primary ms-3 w-auto" type="submit">
          taskify
        </button>
      </form>

      

      <div>
        <h4 class="text-muted mb-4">tasks</h4>
        <For each={taskList}>
          {(task:Task) => (
            <div class="row row-cols-3 mb-3 justify-content-center">
              <button class="btn btn-danger w-auto" onclick={_ =>deleteTask(task.id)}>X</button>
              <div class={`bg-light p-2 mx-2 ${task.completed && 'text-decoration-line-through text-success'}`}>
                {task.text}
              </div>
            <input type="checkbox" checked={task.completed} role="button" class="form-check-input h-auto px-3"
                   onClick={_ => toggleStatus(task.id)}/>
        </div>
        )}
        </For>
      </div> 
      */}
    </div>
  )
}

export default App