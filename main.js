// This code structure is the function that provides a stable "reference" so that it gets the proper variable  
const regex = /function\(\){var a=new _\...,b=new ..;return _\.(..)\(a,..,1,b\)}/gm;
// Reference to the null checker function used in serialization (and many other things [will filter later])
let nullchecker = ""
let nullcheckerWrapper = Object.keys(default_MakerSuite).find(
    (makersuite_key) => {
        const key = default_MakerSuite[makersuite_key]
        if (typeof key != "function") return false
        const sample_obj = {} // Was using for .bind() when testing injecting directly into the store. 
        // Might reuse later, but I can do things perfectly fine without access to the angular store so it was just unnecessary code
        try { 
            nullchecker = regex.exec(key.toString())[1] 
            if (typeof nullchecker == "string"){
                return true
            }
        } catch {return false}
    }
);

window.frequency_penalty = 0.2
window.presence_penalty = 0.2
const originalChecker = default_MakerSuite[nullchecker]
default_MakerSuite[nullchecker] = (a,b,c,d)=>{
    // filter actual payloads, that way we only get the payloads when nullchecking during serialization for Generating Content
    try {if (a[Object.keys(a)[0]] !== undefined && a[Object.keys(a)[0]].length > 10 && c == 16){
        if (a[Object.keys(a)].includes("text/plain")){
            // Is generating content call
            const modded = originalChecker(a,b,c,d)
            modded[Object.keys(a)][10] = window.frequency_penalty
            modded[Object.keys(a)][9] = window.presence_penalty
            return modded
        }
    }} catch{ }
    return originalChecker(a,b,c,d)
} 

// SLIDER CODE (TERRIBLE SLOP I HATE THIS!!!!!!!) (will NEVER! refactor)
const step = .01
const normalize = (val, max, min) => (val - min) / (max - min); 

const sliderResponsiveness = (containerElement, bounds, windowKey) => (e)=>{
    const realValue = parseFloat(containerElement.querySelector("input").value)
    const normalizedValue = normalize(realValue, bounds.max, bounds.min)
    
    const computedWidth = containerElement.querySelector("mat-slider").getClientRects()[0].width
    const change =  computedWidth * normalizedValue
    containerElement.querySelector("mat-slider-visual-thumb").style.transform = "translateX("+change+"px)"
    console.log(change)
    containerElement.querySelector(".mdc-slider__track--active_fill").style.transform = "scaleX("+normalizedValue+")"
    containerElement.querySelector(`input[type="number"]`).value = realValue
    window[windowKey] = realValue
}

const slider = document.querySelector('[title="Top P set of tokens to consider during generation."]')
const sliderContainer = slider.parentElement.parentElement

// Frequency Penalty Setup [ SLOPPY CODE ]
frequencyPenalty = sliderContainer.cloneNode(true)
frequencyPenalty.querySelector("h3").innerText = "Frequency Penalty"

frequencyPenalty.querySelector("input").min = -2
frequencyPenalty.querySelector("input").max = 2
frequencyPenalty.querySelector("input").step = step
frequencyPenalty.querySelector("input").value = 0

frequencyBounds = {min:-2, max:2}
sliderContainer.parentElement.appendChild(frequencyPenalty).querySelector("input").addEventListener("input", sliderResponsiveness(frequencyPenalty, frequencyBounds, "frequency_penalty"))

// Presence Penalty Setup [ SLOPPY CODE ]
presencePenalty = sliderContainer.cloneNode(true)
presencePenalty.querySelector("h3").innerText = "Presence Penalty"

presencePenalty.querySelector("input").min = -2
presencePenalty.querySelector("input").max = 2
presencePenalty.querySelector("input").step = step
presencePenalty.querySelector("input").value = 0

presenceBounds = {min:-2, max:2}
sliderContainer.parentElement.appendChild(presencePenalty).querySelector("input").addEventListener("input", sliderResponsiveness(presencePenalty, presenceBounds, "presence_penalty"))
