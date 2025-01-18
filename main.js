/**
* Regular expression to identify the null checker function within MakerSuite's code.
* @type {RegExp}
*/
const NULL_CHECKER_REGEX = /function\(\){var a=new _\...,b=new ..;return _\.(..)\(a,..,1,b\)}/gm;

/**
* Default values for the control parameters.
* @type {object}
*/
const DEFAULT_VALUES = {
   topK: 40,
   frequencyPenalty: 0.2,
   presencePenalty: 0.2,
   seed: 0,
   penaltiesEnabled: true, // Default penalties to enabled.
   seedEnabled: true,      // Default seed to enabled
};

/**
* Minimum and maximum values for the sliders.
* @type {object}
*/
const SLIDER_BOUNDS = {
   topK: {min: 1, max: 200},
   frequencyPenalty: {min: -2, max: 2},
   presencePenalty: {min: -2, max: 2},
   seed: {min: 0, max: 10000000000},
};

/**
* Name of the variable in the `window` object that will be used to store the control parameter values.
* @type {object}
*/
const WINDOW_VARIABLE_NAMES = {
   topK: "top_k",
   frequencyPenalty: "frequency_penalty",
   presencePenalty: "presence_penalty",
   seed: "random_seed",
   penaltiesEnabled: "penalties_enabled",
   seedEnabled: "seed_enabled", // New variable to control the state of the seed.
};

/**
* Extracts the name of the null checker functio
* @returns {string|null} The name of the null checker function, or null if not found.
*/
function findNullCheckerName() {
   let nullCheckerName = null;

   Object.keys(default_MakerSuite).find((key) => {
       const value = default_MakerSuite[key];
       if (typeof value !== 'function') return false;

       try {
           const match = NULL_CHECKER_REGEX.exec(value.toString());
           if (match) {
               nullCheckerName = match[1];
               return true;
           }
       } catch {
           return false;
       }
   });

   return nullCheckerName;
}

/**
* Overrides the original null checker function to inject control parameters
* into the payload sent to the AI model during text generation.
* @param {string} nullCheckerName - The name of the null checker function.
*/
function overrideNullChecker(nullCheckerName) {
   const originalNullChecker = default_MakerSuite[nullCheckerName];

   default_MakerSuite[nullCheckerName] = (a, b, c, d) => {
       try {
           const firstKey = Object.keys(a)[0];
           // Check if the payload is likely a text generation request
           if (
               a[firstKey] !== undefined &&
               a[firstKey].length > 10 &&
               c === 16 &&
               a[firstKey].includes('text/plain')
           ) {
               const modifiedPayload = originalNullChecker(a, b, c, d);

               // Inject parameters
               modifiedPayload[firstKey][6] = window[WINDOW_VARIABLE_NAMES.topK];


               // Conditionally inject seed
                if (window[WINDOW_VARIABLE_NAMES.seedEnabled]) {
                      modifiedPayload[firstKey][2] = window[WINDOW_VARIABLE_NAMES.seed];
                 }

               // Conditionally inject penalties
               if (window[WINDOW_VARIABLE_NAMES.penaltiesEnabled]) {
                   modifiedPayload[firstKey][10] = window[WINDOW_VARIABLE_NAMES.frequencyPenalty];
                   modifiedPayload[firstKey][9] = window[WINDOW_VARIABLE_NAMES.presencePenalty];
               }


               return modifiedPayload;
           }
       } catch (error) {
           console.error("Error in the null checker override: ", error);
       }

       return originalNullChecker(a, b, c, d);
   };
}

/**
* Normalizes a value to a 0-1 range.
* @param {number} val - The value to normalize.
* @param {number} max - The maximum value of the range.
* @param {number} min - The minimum value of the range.
* @returns {number} The normalized value.
*/
function normalize(val, max, min) {
   return (val - min) / (max - min);
}

/**
* Creates an event handler for slider input events.
* Updates the slider's visual representation and the corresponding window variable.
* @param {HTMLElement} containerElement - The slider's container element.
* @param {object} bounds - The minimum and maximum values for the slider.
* @param {string} windowKey - The name of the window variable to update.
* @returns {(e: Event) => void} The event handler function.
*/
function createSliderEventHandler(containerElement, bounds, windowKey) {
   return (event) => {
       let realValue = parseFloat(containerElement.querySelector('input').value);

       const normalizedValue = normalize(realValue, bounds.max, bounds.min);

       const sliderThumb = containerElement.querySelector('mat-slider-visual-thumb');
       const sliderTrack = containerElement.querySelector('.mdc-slider__track--active_fill');
       const numberInput = containerElement.querySelector('input[type="number"]');

       if (sliderThumb) {
           const sliderWidth = containerElement.querySelector('mat-slider').getClientRects()[0].width;
           const thumbPosition = sliderWidth * normalizedValue;
           sliderThumb.style.transform = `translateX(${thumbPosition}px)`;
       }

       if (sliderTrack) {
           sliderTrack.style.transform = `scaleX(${normalizedValue})`;
       }

       if (numberInput) {
           numberInput.value = realValue;
       }

       window[windowKey] = realValue;
   };
}

/**
* Adds a new slider to the UI.
* @param {HTMLElement} originalSliderContainer - The container of the original slider to clone.
* @param {string} title - The title of the new slider.
* @param {object} bounds - The minimum and maximum values for the slider.
* @param {string} windowKey - The name of the window variable to update.
*/
function addSlider(originalSliderContainer, title, bounds, windowKey) {
   const newSliderContainer = originalSliderContainer.cloneNode(true);
   newSliderContainer.querySelector('h3').innerText = title;

   const inputElement = newSliderContainer.querySelector('input');
   inputElement.min = bounds.min;
   inputElement.max = bounds.max;
   inputElement.value =
       DEFAULT_VALUES[
           Object.keys(WINDOW_VARIABLE_NAMES).find(
               (key) => WINDOW_VARIABLE_NAMES[key] === windowKey
           )
           ] || 0;

   // Ensure integer values for Top K and Seed
   if (windowKey === WINDOW_VARIABLE_NAMES.topK || windowKey === WINDOW_VARIABLE_NAMES.seed){
      inputElement.step = 1;
   } else {
      inputElement.step = 0.01;
   }


   const sliderEventHandler = createSliderEventHandler(
       newSliderContainer,
       bounds,
       windowKey
   );
   inputElement.addEventListener('input', sliderEventHandler);

   // Add an event listener to the number input box for manual changes
   const numberInput = newSliderContainer.querySelector('input[type="number"]');
   if (numberInput) {
       numberInput.addEventListener('change', (event) => {
           const newValue = parseFloat(event.target.value);
           inputElement.value = newValue;
           sliderEventHandler(event);
       });
   }

   // Add a button for random seed generation below the Seed slider
   if (windowKey === WINDOW_VARIABLE_NAMES.seed) {
       const randomSeedButton = document.createElement('button');
       randomSeedButton.innerText = 'Randomize';
       randomSeedButton.style.display = 'block';
       randomSeedButton.style.marginTop = '10px';
       randomSeedButton.style.width = '95%';
       randomSeedButton.addEventListener('click', () => {
           const randomSeed =
               Math.floor(Math.random() * (bounds.max - bounds.min + 1)) + bounds.min;
           inputElement.value = randomSeed;
           if (numberInput){
             numberInput.value = randomSeed;
           }
           sliderEventHandler();
       });

       newSliderContainer.appendChild(randomSeedButton);
   }
   originalSliderContainer.parentElement.appendChild(newSliderContainer);
}


/**
* Adds a checkbox to enable/disable penalties.
* @param {HTMLElement} originalSliderContainer - The container of the original slider to use as a template
*/
function addPenaltyCheckbox(originalSliderContainer){
   const newCheckboxContainer = originalSliderContainer.cloneNode(true);
   newCheckboxContainer.querySelector('h3').innerText = "Enable"

   const checkbox = document.createElement('input');
   checkbox.type = 'checkbox';
   checkbox.checked = DEFAULT_VALUES.penaltiesEnabled; // Set the checkbox's default state
   checkbox.style.marginLeft = "10px"

   const label = document.createElement('label');
   label.style.marginLeft = "5px"
   label.appendChild(document.createTextNode(" use of Penalties?"));

   const numberInput = newCheckboxContainer.querySelector('input[type="number"]');
   if (numberInput){
        numberInput.remove();
   }

   const matSlider = newCheckboxContainer.querySelector('mat-slider')
   if (matSlider){
       matSlider.remove()
   }


   const mdcSlider = newCheckboxContainer.querySelector('.mdc-slider')
     if (mdcSlider){
         mdcSlider.remove();
    }
   const h3Element = newCheckboxContainer.querySelector('h3')
   h3Element.appendChild(checkbox)
   h3Element.appendChild(label);

   checkbox.addEventListener('change', () => {
       window[WINDOW_VARIABLE_NAMES.penaltiesEnabled] = checkbox.checked;
   })

   originalSliderContainer.parentElement.appendChild(newCheckboxContainer);
}



/**
* Adds a checkbox to enable/disable seed.
* @param {HTMLElement} originalSliderContainer - The container of the original slider to use as a template
*/
function addSeedCheckbox(originalSliderContainer){
   const newCheckboxContainer = originalSliderContainer.cloneNode(true);
       newCheckboxContainer.querySelector('h3').innerText = "Enable"

   const checkbox = document.createElement('input');
   checkbox.type = 'checkbox';
   checkbox.checked = DEFAULT_VALUES.seedEnabled; // Set the checkbox's default state
   checkbox.style.marginLeft = "10px"

   const label = document.createElement('label');
   label.style.marginLeft = "5px"
   label.appendChild(document.createTextNode("Manual Seed?"));

       const numberInput = newCheckboxContainer.querySelector('input[type="number"]');
       if (numberInput){
           numberInput.remove();
       }

       const matSlider = newCheckboxContainer.querySelector('mat-slider')
       if (matSlider){
            matSlider.remove()
        }

       const mdcSlider = newCheckboxContainer.querySelector('.mdc-slider')
          if (mdcSlider){
               mdcSlider.remove();
           }
   const h3Element = newCheckboxContainer.querySelector('h3')
     h3Element.appendChild(checkbox)
     h3Element.appendChild(label);


   checkbox.addEventListener('change', () => {
       window[WINDOW_VARIABLE_NAMES.seedEnabled] = checkbox.checked;
   })

   originalSliderContainer.parentElement.appendChild(newCheckboxContainer);
}

/**
* Initializes the control parameters in the window object with default values.
*/
function initializeWindowVariables() {
   for (const key in WINDOW_VARIABLE_NAMES) {
       window[WINDOW_VARIABLE_NAMES[key]] = DEFAULT_VALUES[key];
   }
}

/**
* Main function to set up the custom sliders and override the null checker.
*/
function main() {
   initializeWindowVariables();

   const nullCheckerName = findNullCheckerName();
   if (!nullCheckerName) {
       console.error('Null checker function not found. Aborting.');
       return;
   }

   overrideNullChecker(nullCheckerName);

   const originalSlider = document.querySelector(
       '[title="Top P set of tokens to consider during generation."]'
   );
   if (!originalSlider) {
       console.error('Original slider not found. Aborting.');
       return;
   }
   const originalSliderContainer = originalSlider.parentElement.parentElement;


   addSlider(
       originalSliderContainer,
       'Top K',
       SLIDER_BOUNDS.topK,
       WINDOW_VARIABLE_NAMES.topK
   );
   addSlider(
       originalSliderContainer,
       'Frequency Penalty',
       SLIDER_BOUNDS.frequencyPenalty,
       WINDOW_VARIABLE_NAMES.frequencyPenalty
   );
   addSlider(
       originalSliderContainer,
       'Presence Penalty',
       SLIDER_BOUNDS.presencePenalty,
       WINDOW_VARIABLE_NAMES.presencePenalty
   );
   addSlider(
       originalSliderContainer,
       'Seed',
       SLIDER_BOUNDS.seed,
       WINDOW_VARIABLE_NAMES.seed
   );

   addPenaltyCheckbox(originalSliderContainer)
   addSeedCheckbox(originalSliderContainer)
}

// Execute the main function
main();
