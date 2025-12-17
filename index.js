// local storage integration
let currentGroups = null

function saveGroups(){
    if(currentGroups){
        try {
            localStorage.setItem('todoGroups', JSON.stringify(currentGroups))
        } catch (e) {
            console.warn('Failed to save todos to localStorage:', e)
        }
    }
}

function loadGroups(){
    try {
        const saved = localStorage.getItem('todoGroups')
        return saved ? JSON.parse(saved) : null
    } catch (e) {
        console.warn('Failed to load todos from localStorage:', e)
        return null
    }
}

//load button 
document.getElementById("load-btn").addEventListener("click",async () =>{
    const markdown = await getMarkdownText()
    
    if(!markdown){
        console.warn("No markdown provided")
        return
    }

    const data  = parseMarkdown(markdown);
    currentGroups = data
    renderGroups(data)
    saveGroups()
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


ProgressBarElement = document.getElementById("progress-bar-container")

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
    saveGroups()
}

const themeToggle = document.getElementById("theme-toggle");
const body = document.body;

// restore saved theme
try {
    if (localStorage.getItem("theme") === "light") {
        body.classList.add("light");
        themeToggle.textContent = "🌙";
    } else {
        themeToggle.textContent = "☀️";
    }
} catch (e) {
    console.warn('Failed to load theme from localStorage:', e)
    themeToggle.textContent = "☀️";
}

themeToggle.addEventListener("click", () => {
  body.classList.toggle("light");
  const isLight = body.classList.contains("light");
  themeToggle.textContent = isLight ? "🌙" : "☀️";
  try {
      localStorage.setItem("theme", isLight ? "light" : "dark");
  } catch (e) {
      console.warn('Failed to save theme to localStorage:', e)
  }
});


// load saved data on page startup 
const loadedGroups = loadGroups()
if(loadedGroups) {
    currentGroups = loadedGroups;
    renderGroups(loadedGroups)
    Mathjax.typesetPromise()
}