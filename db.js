/* Owner-editable database for MockQuiz */
/* Add/Edit subjects, topics, questions here */

const QUIZ_DB = {
  subjects: [
    {
      id: "gs",
      name: "General Studies",
      topics: [
        {
          id: "gs-hist",
          name: "History",
          questions: [
            {
              id: "q1",
              type: "mcq-single",
              text: "Who was the first Governor-General of India?",
              image: null,
              options: [
                "Lord Canning",
                "Lord Mountbatten",
                "Warren Hastings",
                "Robert Clive"
              ],
              answer: 2,
              explanation: "Warren Hastings served as the first Governor-General from 1773 to 1785."
            },
            {
              id: "q2",
              type: "mcq-single",
              text: "In which year did the Battle of Plassey occur?",
              image: null,
              options: ["1757", "1857", "1764", "1748"],
              answer: 0,
              explanation: "The Battle of Plassey was fought in 1757 between the British and Siraj-ud-Daulah."
            }
          ]
        },
        {
          id: "gs-geog",
          name: "Geography",
          questions: [
            {
              id: "q3",
              type: "mcq-single",
              text: "Which is the largest desert in the world?",
              image: null,
              options: ["Sahara", "Gobi", "Arabian", "Antarctic Desert"],
              answer: 3,
              explanation: "Antarctic Desert is the largest desert by area."
            },
            {
              id: "q4",
              type: "mcq-single",
              text: "The Tropic of Cancer passes through how many Indian states?",
              image: null,
              options: ["6", "8", "5", "7"],
              answer: 1,
              explanation: "Tropic of Cancer passes through 8 Indian states."
            }
          ]
        }
      ]
    },

    {
      id: "apt",
      name: "Aptitude",
      topics: [
        {
          id: "apt-math",
          name: "Quantitative Aptitude",
          questions: [
            {
              id: "q5",
              type: "mcq-single",
              text: "What is 25% of 240?",
              image: null,
              options: ["50", "60", "55", "65"],
              answer: 1,
              explanation: "25% of 240 = 240 × 0.25 = 60."
            },
            {
              id: "q6",
              type: "mcq-single",
              text: "A train of 120m length crosses a pole in 6 seconds. What is its speed?",
              image: null,
              options: ["20 m/s", "15 m/s", "25 m/s", "12 m/s"],
              answer: 0,
              explanation: "Speed = Distance/Time = 120/6 = 20 m/s."
            }
          ]
        },
        {
          id: "apt-reas",
          name: "Reasoning",
          questions: [
            {
              id: "q7",
              type: "mcq-single",
              text: "Which shape is different from the other three?",
              image: "images/sample_shape.png", // example image path
              options: ["Circle", "Triangle", "Square", "Cylinder"],
              answer: 3,
              explanation: "Cylinder is 3D whereas others are 2D shapes."
            },
            {
              id: "q8",
              type: "mcq-single",
              text: "Find the odd one out: Apple, Mango, Orange, Carrot",
              image: null,
              options: ["Apple", "Mango", "Orange", "Carrot"],
              answer: 3,
              explanation: "Carrot is a vegetable; others are fruits."
            }
          ]
        }
      ]
    }
  ]
};