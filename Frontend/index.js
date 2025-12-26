let workspaces = []
let currentWorkspaceId = null

// workspace storage 
function saveWorkspaces(){
    localStorage.setItem("workspaces",JSON.stringify(workspaces))
}

function loadWorkspaces(){
    const saved = localStorage.getItem("workspaces")
    if (!saved) return []
    
    try {
        const parsed = JSON.parse(saved);
        // Ensure it's an array of valid workspace objects
        return Array.isArray(parsed) ? parsed : [];
    } catch(err) {
        console.error("Failed to parse saved workspaces:", err);
        return [];
    }
}
function getCurrentWorkspace(){
    return workspaces.find( w => w.id === currentWorkspaceId) || null
}

function setCurrentWorkspace(workspaceId){
    currentWorkspaceId = workspaceId
    renderCurrentWorkspace()
}

function getWorkspaceCount(){
    let count =[0,0]
    workspaces.filter(w => !w.archived).forEach(w => {
        count[0] += 1;
    });
    count[1] = workspaces.length - count[0]
    return count;
}
function renderCurrentWorkspace(){
    if (getWorkspaceCount()[0]===0){
        renderEmptyState()
    }
    else{
    const workspace = getCurrentWorkspace()
    if(!workspace) {
        document.getElementById("ws-title").textContent = "No Workspace Selected"
        document.getElementById("todo-main").innerHTML = ""
    }
    renderGroups(workspace.groups)
    document.getElementById("ws-title").textContent = workspace.title
    }
}

function createWorkspaceFromMarkdown(markdown){
    const groups = parseMarkdown(markdown)
    const workspace = {
        id : crypto.randomUUID(),
        title : inferWorkspaceTitle(markdown),
        groups : groups,
        archived : false
    }
    workspaces.unshift(workspace)
    currentWorkspaceId = workspace.id
    
    saveWorkspaces()
    renderCurrentWorkspace()
}

function inferWorkspaceTitle(markdown) {
    const firstLine = markdown.split("\n").find(l => l.trim())
    if (!firstLine) return "Untitled Workspace"
    return firstLine.replace(/^#+\s*/, "").slice(0, 40)
}
console.log("getTodoCount =", getTodoCount, typeof getTodoCount);

function getTodoCount(workspace){
    let count = 0
    (workspace.groups || []).forEach(g => { count += (g.todos||[]).length })
    return count
}


const wsTitle = document.getElementById("ws-title");
const wsDropdown = document.getElementById("ws-dropdown");
const wsDropdownMenu = document.getElementById("ws-dropdown-content");

function renderWorkspaceList(){
    wsDropdownMenu.innerHTML = "";
    workspaces
      .filter(w => !w.archived)
      .forEach(w => {
        const item = document.createElement("div");
        item.className = "workspace-item";
        item.textContent = w.title;

        item.addEventListener("click", () => {
            setCurrentWorkspace(w.id);
            wsDropdownMenu.setAttribute("hidden", "");
            wsTitle.dataset.open = "false";
        });

        wsDropdownMenu.appendChild(item);
      });

      wsDropdownMenu.appendChild(document.createElement("hr"))
      const heading = document.createElement("p");
      heading.textContent = "Archived";
      heading.className = "workspace-item";
      wsDropdownMenu.appendChild(heading);

      workspaces.filter(w => w.archived).forEach(w => {
        const item = document.createElement("div");
        item.className = "workspace-item";
        item.textContent = w.title;
        item.style.opacity = "0.8";

        item.addEventListener("click", () => {
            setCurrentWorkspace(w.id);
            wsDropdownMenu.setAttribute("hidden", "");
            wsTitle.dataset.open = "false";
        });

        wsDropdownMenu.appendChild(item);
      });
}

wsTitle.addEventListener("click", (e) => {
    e.stopPropagation();

    const isOpening = wsDropdownMenu.hasAttribute("hidden");

    if (isOpening) {
        renderWorkspaceList();
        wsDropdownMenu.removeAttribute("hidden");
        wsTitle.dataset.open = "true";
    } else {
        wsDropdownMenu.setAttribute("hidden", "");
        wsTitle.dataset.open = "false";
    }
});

document.addEventListener("click", () => {
    wsDropdownMenu.setAttribute("hidden", "");
    wsTitle.dataset.open = "false";
});



function archiveCurrentWorkspace(){
    const workspace = getCurrentWorkspace()
    if(workspace){
        workspace.archived = true
        currentWorkspaceId = null
        saveWorkspaces()
        document.getElementById("todo-main").innerHTML = ""
        document.getElementById("ws-title").textContent = "No Workspace Selected"
    }
}

document.getElementById('archive-workspace')?.addEventListener('click', () => {
    archiveCurrentWorkspace()
})

//load button 
document.getElementById("load-btn").addEventListener("click",async () =>{
    const markdown = await getMarkdownText()
    
    if(!markdown){
        console.warn("No markdown provided")
        return
    }
    createWorkspaceFromMarkdown(markdown)
    MathJax.typesetPromise()
})

// make it such that when a file input it given . text input window becomes empty string so that when loading ,
//  file gets loaded instead of default text
document.getElementById("file-input").addEventListener("change",()=>{
    document.getElementById("text-input").value = ""
})

async function getMarkdownText() {
    const textarea = document.getElementById("text-input")
    const fileinput = document.getElementById("file-input")

    const text = textarea.value.trim();
    if (text.length>0){
        return text
    }

    const file = fileinput.files[0]
    if(file){
        try{
            return await file.text();
        }
        catch(err){
            console.error("Failed to read file : ",err)
            return ""
        }
    }
    return ""
}

function parseMarkdown(text){
    const lines = text.split("\n")

    const groups = []
    let currentGroup = null

    const defaultGroup = {
        title : "Ungrouped",
        todos : [],
        collapsed : false
    }

    lines.forEach(rawLine => {
        const line = rawLine.trim()

        if(line.length === 0 ){
            return;
        }

        if (line.startsWith("#")){
            const title = line.replace(/^#+\s*/, "")

            currentGroup = {
                title : title || "untitled",
                todos : [] ,
                collapsed : false
            }

            groups.push(currentGroup);
            return
        }

        //for items 
        if (line.startsWith("-")){
            const todoText = line.replace(/^-+\s*/, "").trim()

            if (todoText.length === 0) {
                return; // Skip empty todos
            }

            const todo = {
                text: todoText,
                done: false
            }

            if(currentGroup){
                currentGroup.todos.push(todo);
            }
            else{
                defaultGroup.todos.push(todo)
            }
        }
    });

    if(defaultGroup.todos.length > 0 ){
        groups.unshift(defaultGroup)
    }

    
    return groups
}


const ProgressBarElement = document.getElementById("progress-bar-container")

function ProgressBar(groups){
    let totalCount = 0 ;
    let completedCount = 0;
    groups.forEach(group => {
        group.todos.forEach(todo => {
            totalCount++
            if(todo.done) completedCount++;
        });
    });
    if (totalCount === 0) {
        return 0;
    }
    const progressPercentage = (completedCount/totalCount)*100;
    return progressPercentage
}

function updateProgressBar(groups){
    const progress = ProgressBar(groups)
    ProgressBarElement.style.setProperty("--progress", `${progress}%`)
        ProgressBarElement.setAttribute(
        "data-label",
        `Progress : ${Math.round(progress)}%`
        )
}

function renderGroups(groups){
    const container = document.getElementById("todo-main")
    
    container.innerHTML = "";

    groups.forEach(group => {
        const groupTitle = document.createElement("h3")
        groupTitle.textContent = group.title
        groupTitle.className = "group-title"

        //click to collapse and expand contents inside each header 
        groupTitle.addEventListener("click",()=>{
            group.collapsed = !group.collapsed
            renderGroups(groups)
        })

        container.appendChild(groupTitle)

        // todo container
        const groupTodos = document.createElement("div")
        groupTodos.className = "group-todos"
        container.appendChild(groupTodos)

        //hide if collapsed 
        if (group.collapsed){
            groupTodos.style.display = "none"
            groupTitle.classList.add("collapsed");
        }

        //render todos 
        group.todos.forEach(todo => {
            const todoEl = document.createElement("div")
            todoEl.innerHTML = todo.text;
            todoEl.className = "todo-item"

            //apply visual state 
            if (todo.done){
                todoEl.classList.add("done")
            }

            //click to toggle 
            todoEl.addEventListener("click",(e)=>{
                e.stopPropagation()
                todo.done = !todo.done
                renderGroups(groups)
            })

            groupTodos.appendChild(todoEl)
        });
    });
    updateProgressBar(groups)
    saveWorkspaces()
}

const themeToggle = document.getElementById("theme-toggle");
const body = document.body;


function resetApp(){
    const confirmReset = confirm("Are you sure you want to reset the app? This will clear all workspaces and todos.")
    if (!confirmReset) {
        return
    }

    workspaces = []
    currentWorkspaceId = null

    localStorage.removeItem("workspaces");

    document.getElementById("todo-main").innerHTML = "";
    document.getElementById("workspace-list").innerHTML = "";

    //reset progress bar
    const ProgressBar = document.getElementById("progress-bar-container")
    ProgressBar.style.setProperty("--progress", "0%");
    ProgressBar.setAttribute("data-label", "Progress : 0%")

    alert("App has been reset.")
}

document.getElementById("reset-app")?.addEventListener("click", resetApp);

// restore saved theme
if (localStorage.getItem("theme") === "light") {
  body.classList.add("light");
  themeToggle.textContent = "🌙";
} else {
  themeToggle.textContent = "☀️";
}

themeToggle.addEventListener("click", () => {
  body.classList.toggle("light");
  const isLight = body.classList.contains("light");
  themeToggle.textContent = isLight ? "🌙" : "☀️";
  localStorage.setItem("theme", isLight ? "light" : "dark");
});


document.getElementById("load-raw-btn").addEventListener("click", async () => {
    const rawInput = document.getElementById("raw-input").value;
    if (!rawInput.trim()) {
        alert("Please enter some text first.");
        return;
    }

    try {
        const response = await fetch("api/breakdown", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ task: rawInput })
        });

        const data = await response.json();
        if (data.text) {
            createWorkspaceFromMarkdown(data.text);
        } else {
            alert("Failed to break down the task.");
        }
    } catch (error) {
        console.error("Error: The meow", error);
        alert("An error occurred while processing your request.");
    }
});

function renderEmptyState(){
    const canvas= document.getElementById("canvas")
    canvas.innerHTML=`
        <div id="canvas-empty" hidden>
            <h2>No workspaces yet</h2>
            <p>Load markdown or paste raw text to get started.</p>
            <p>Click on the header to check for any archived workspaces.</p>
        </div>
    `
}

// load saved data on page startup 
function initApp(){
    workspaces = loadWorkspaces() 

    const firstActive = workspaces.length<0 ? null : workspaces.find(w => !w.archived)
    if (firstActive) {
        currentWorkspaceId = firstActive.id
        renderCurrentWorkspace()
    }
    else{
        renderEmptyState()
    }
}

initApp()