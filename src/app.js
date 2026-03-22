App = {
  loading: false,
  account: null,
  provider: null,
  signer: null,
  todoList: null,
  abi: [],
  address: null,

  load: async () => {
    await App.loadEthers()
    await App.loadAccount()
    await App.loadContract()
    await App.render()
  },

  loadEthers: async () => {
    if (!window.ethereum) {
      alert("Please install or enable MetaMask.")
      return
    }

    await window.ethereum.request({ method: "eth_requestAccounts" })
    App.provider = new ethers.BrowserProvider(window.ethereum)
    App.signer = await App.provider.getSigner()
  },

  loadAccount: async () => {
    App.account = await App.signer.getAddress()
  },

  loadContract: async () => {
  const todoListArtifact = await $.getJSON("TodoList.json")
  App.abi = todoListArtifact.abi

  const networkKeys = Object.keys(todoListArtifact.networks || {})
  if (networkKeys.length === 0) {
    alert("TodoList contract is not deployed. Run truffle migrate --reset.")
    return
  }

  const deployedNetworkId = networkKeys[0]
  App.address = todoListArtifact.networks[deployedNetworkId].address
  App.todoList = new ethers.Contract(App.address, App.abi, App.signer)
},

  render: async () => {
    if (App.loading) return

    App.setLoading(true)
    $("#account").html(App.account)
    await App.renderTasks()
    App.bindForm()
    App.setLoading(false)
  },

  bindForm: () => {
    $("#taskForm").off("submit").on("submit", async function (e) {
      e.preventDefault()
      await App.createTask()
    })
  },

  renderTasks: async () => {
    $("#taskList").find(".taskItem").remove()
    $("#completedTaskList").empty()

    const taskCount = await App.todoList.taskCount()
    const $taskTemplate = $(".taskTemplate")

    for (let i = 1; i <= Number(taskCount); i++) {
      const task = await App.todoList.tasks(i)
      const taskId = Number(task[0])
      const taskContent = task[1]
      const taskCompleted = task[2]

      const $newTaskTemplate = $taskTemplate.clone()
      $newTaskTemplate.removeClass("taskTemplate")
      $newTaskTemplate.addClass("taskItem")
      $newTaskTemplate.find(".content").html(taskContent)
      $newTaskTemplate.find("input")
        .prop("name", taskId)
        .prop("checked", taskCompleted)
        .on("click", App.toggleCompleted)

      if (taskCompleted) {
        $("#completedTaskList").append($newTaskTemplate)
      } else {
        $("#taskList").append($newTaskTemplate)
      }

      $newTaskTemplate.show()
    }
  },

  createTask: async () => {
    App.setLoading(true)
    const content = $("#newTask").val().trim()

    if (!content) {
      App.setLoading(false)
      return
    }

    const tx = await App.todoList.createTask(content)
    await tx.wait()
    window.location.reload()
  },

  toggleCompleted: async (e) => {
    App.setLoading(true)
    const taskId = e.target.name
    const tx = await App.todoList.toggleCompleted(taskId)
    await tx.wait()
    window.location.reload()
  },

  setLoading: (boolean) => {
    App.loading = boolean
    const loader = $("#loader")
    const content = $("#content")

    if (boolean) {
      loader.show()
      content.hide()
    } else {
      loader.hide()
      content.show()
    }
  }
}

$(() => {
  $(window).on("load", () => {
    App.load()
  })
})