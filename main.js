const GAME_STATE = {
  FirstCardAwaits: 'FirstCardAwaits',
  SecondCardAwaits: 'SecondCardAwaits',
  CardsMatchFailed: 'CardsMatchFailed',
  CardsMatched: 'CardMatched',
  GameFinished: 'GameFinished'
}

const SUIT = [
  // [spades, heart, diamond, club]
  "https://svgshare.com/i/btJ.svg",
  "https://svgshare.com/i/bu8.svg",
  "https://svgshare.com/i/bto.svg",
  "https://svgshare.com/i/bsQ.svg"
]

//MVC : view
const view = {
  
  // Methods:

  getCardContent (index) {
    // number: ex. 5 / 13 = 0...5 -> spades 6  
    const number = this.transformNumber((index % 13) + 1)
    const suit = SUIT[Math.floor(index / 13)]
    return `
      <p>${number}</p>
      <img src=${suit}>
      <p>${number}</p>
    `
  },

  // getCardElement - 負責生成卡片內容，包括花色和數字
  // index from 0-51
  // 0-12：黑桃 1-13
  // 13-25：愛心 1-13
  // 26-38：方塊 1-13
  // 39-51：梅花 1-13
  getCardElement (index) {
    return `
      <div class="card card-back" data-index=${index}>
      </div>
    `
  },

  // transformNumber - 特殊數字轉換
  transformNumber (number) {
    switch (number) {
      case 1:
        return 'A'
      case 11:
        return 'J'
      case 12:
        return 'Q'
      case 13:
        return 'K'
      default:
        return number
    }
  },

  // displayCards - 負責選出 #cards 並抽換內容
  displayCards (indexes) {
    const cardWrapper = document.querySelector('#cards')
    cardWrapper.innerHTML = indexes.map(index => this.getCardElement(index)).join("")
  },

  // ...運算子會把傳入的所有參數轉為矩陣，ex.1 -> [1], 1,2 -> [1,2]
  // 呼叫時的參數前面加上...則是反過來，把矩陣變成個別參數，ex. [1,2] -> 1,2
  // 定義時與呼叫時...的涵義有點不一樣
  flipCards(...cards) {
    cards.forEach(card => {
      if (card.classList.contains('card-back')) {
        card.classList.remove('card-back')
        card.innerHTML = this.getCardContent(Number(card.dataset.index))
        return
      }
      card.classList.add('card-back')
      card.innerHTML = null
    })
  },

  pairCards (...cards) {
    cards.forEach(card => {
      card.classList.add('card-paired')
    })
  },

  renderScore(score) {
    document.querySelector('#score').innerText = String(score)
  },

  renderTriedTimes(times) {
    document.querySelector('#tried-times').innerText = String(times)
  },

  playWrongAnimation (...cards) {
    cards.forEach(card => {
      // 判斷點到的是card本身還是他的children，若是child，則把card改成parentElement
      card.classList.add('wrong')
      card.addEventListener('animationend', event => {
        card.classList.remove('wrong')
      }, {once: true})
    })
  },

  showGameFinished () {
    const finished = document.querySelector('.finished')
    finished.classList.remove('invisible')
    finished.lastElementChild.addEventListener('click', controller.initializeGame)
  }
}

const utility = {
  getRandomNumberArray (count) {
    // count = 5 -> [2,3,4,1,0]
    const number = Array.from(Array(count).keys())
    for (let index = number.length - 1; index > 0; index--) {
      let randomIndex = Math.floor(Math.random() * (index + 1))
      // 分號是避免錯誤 Math.floor()[] -> error
      ;[number[index], number[randomIndex]] = [number[randomIndex], number[index]]
    }
    return number
  }
}

const controller = {
  currentState: GAME_STATE.FirstCardAwaits, // default
  
  generateCards() {
    view.displayCards(utility.getRandomNumberArray(52))
  },

  // 依照不同遊戲狀態做不同行為
  dispatchCardAction (card) {
    
    let isSameCardClicked = card === model.revealedCards[0] || card.parentElement === model.revealedCards[0]

    // 非卡背就且非同一張卡就return
    if (!card.classList.contains('card-back') && !isSameCardClicked) {
      return
    }

    switch (this.currentState) {
      case GAME_STATE.FirstCardAwaits:
        view.flipCards(card)
        model.revealedCards.push(card)
        this.currentState = GAME_STATE.SecondCardAwaits
        return console.log('wait for next card')
      case GAME_STATE.SecondCardAwaits:
        // 如果點擊的第二次是完全同一張卡片，則reset此卡片且回到FirstCardAwaits狀態
        if (card === model.revealedCards[0] || card.parentElement === model.revealedCards[0]) {
          this.resetCards()
          return console.log('same card')
        }

        view.flipCards(card)
        model.revealedCards.push(card)
        
        if (model.isRevealCardsMatched()) {
          // 配對成功
          this.currentState = GAME_STATE.CardsMatched
          model.score += model.scoreIncrement
          view.renderScore(model.score)
          view.renderTriedTimes(model.triedTimes)
          
          view.pairCards(...model.revealedCards)  // ...把矩陣展開
          this.currentState = GAME_STATE.FirstCardAwaits
          model.revealedCards = []
          if (model.score === 260) {
            this.currentState = GAME_STATE.GameFinished
            view.showGameFinished()
          }
        } else {
          // 配對失敗
          view.playWrongAnimation(...model.revealedCards)
          this.currentState = GAME_STATE.CardsMatchFailed
          let timer = setTimeout(this.resetCards, 1000)
          // 如果玩家在動畫播放期間點擊任何地方，動畫會提早結束
          addEventListener('mouseup', () => {
              clearTimeout(timer)
              this.resetCards()
              // 這裡是避免user過快的點擊，因此保留0.2s的時間做state change
              controller.currentState = GAME_STATE.CardsMatchFailed
              setTimeout(() => {
                this.currentState = GAME_STATE.FirstCardAwaits
              }, 200)
              console.log('skip animation')
            }, {once: true})
        }
      }
    model.triedTimes += 1
    view.renderTriedTimes(model.triedTimes)
  },

  // 由於setTimeOut handler的this指向瀏覽器，要把handler裡的this改成指定controller
  resetCards () {
    view.flipCards(...model.revealedCards)
    model.revealedCards.forEach(card => {
      if (card.classList.contains('wrong')) {
        card.classList.remove('wrong')
      }
    })
    controller.currentState = GAME_STATE.FirstCardAwaits
    model.revealedCards = []
  },

  initializeGame () {
    // 結束畫面隱藏
    const finished = document.querySelector('.finished')
    if (!finished.classList.contains('invisible')) {
      finished.classList.add('invisible')
    }
    // 生成新卡片並綁定監聽器
    controller.generateCards()
    const cards = document.querySelectorAll('.card')
    cards.forEach(card => addEventListener('click', onCardClicked))
    // 重設參數
    model.score = 0
    model.triedTimes = 0
    model.revealedCards = []
    // 渲染分數與嘗試次數
    view.renderScore(model.score)
    view.renderTriedTimes(model.triedTimes) 
    // 改變狀態
    controller.currentState = GAME_STATE.FirstCardAwaits
  }
}

const model = {
  revealedCards: [],
  score: 0,
  triedTimes: 0,
  scoreIncrement : 10,

  isRevealCardsMatched () {
    return this.revealedCards[0].dataset.index %13 === this.revealedCards[1].dataset.index % 13
  }
}



// Main Process (不要讓 controller 以外的內部函式暴露在 global 的區域)
controller.initializeGame()

// Functions
function onCardClicked (event) {
  const target = event.target
  controller.dispatchCardAction(target)
}