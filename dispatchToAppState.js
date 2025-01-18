const runsettingkey = Object.keys(default_MakerSuite).find(
    (makersuite_key) => {
        const key = default_MakerSuite[makersuite_key]
        if (typeof key != "function") return false
        const sample_obj = {}
        try {
            key.bind(sample_obj)()
            return (sample_obj.type == "[MS][RunSettings] Set run settings") 
        } catch {return false} 
    }
)


const functions = {}
const aKey = 1
const bKey = 2

const stateObjects = {}
default_MakerSuite[runsettingkey].bind(stateObjects)(aKey,bKey);
const stateKeys = Object.keys(stateObjects).filter((key)=>!(["type","index"].includes(key)));
function INTERCEPT (a,b){
    if (Object.values(a)[0]["type"] === "INTERCEPTEDSTATE"){
        const payload = Object.values(a)[0]
        this.index = b;
        this.type = stateObjects["type"]
        this[stateKeys[0]] = {}
        console.log(stateKeys)
        this[stateKeys[0]][payload.path] = payload.value
    } else {
        this[stateKeys[0]] = a;
        this.index = b;
        this.type = stateObjects["type"]
    }
    console.log("State made with ", this)
}
default_MakerSuite[runsettingkey] = INTERCEPT

const slider = document.querySelector('[title="Top P set of tokens to consider during generation."]')

// app state dispatcher is everywhere with an event listener that ties to state
const sliderDispatch = slider.eventListeners()[0]

const dispatchToAppState = ({path, value}) => 
    sliderDispatch({type:"INTERCEPTEDSTATE", originalDispatchValue:slider.querySelector("input").value, path, value})

dispatchToAppState({path:"enableEnhancedCivicAnswers", value:false})
