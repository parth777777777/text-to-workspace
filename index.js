document.getElementById("load-btn").addEventListener("click",async () =>{
    const markdown = await getMarkdownText()
    
    if(!markdown){
        console.warn("No markdown provided")
        return
    }

    const data  = parseMarkdown(markdown);
    renderGroups(data)
})



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
            const todoText = line.replace(/^-+\s*/, "")

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
    MathJax.typesetPromise();
}

const themeToggle = document.getElementById("theme-toggle");
const body = document.body;

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


function checkProgress(groups){
    const todoCount = groups.length * groups.todo.length ;
    let progressCount = 0
    groups.todo.forEach(todoTask => {
        done === true ? progressCount++ : null
    });
    return (progressCount/todoCount)*100
}

// create a function to render progress bar . make it such that everytime rendergroups renders , we also render the progress bar