class TrafficLightFSM {
    constructor() {
        this.state = 'RED';
    }

    onEvent(event) {
        switch (this.state) {
            case 'RED':
                if (event === 'timer') {
                    this.state = 'GREEN';
                }
                break;
            case 'GREEN':
                if (event === 'timer') {
                    this.state = 'YELLOW';
                }
                break;
            case 'YELLOW':
                if (event === 'timer') {
                    this.state = 'RED';
                }
                break;
        }
    }

    toString() {
        return `The traffic light is ${this.state}`;
    }
}

class PedestrianTrafficLightFSM extends TrafficLightFSM {
    constructor() {
        super();
        this.state = 'DON’T WALK';
    }

    onEvent(event) {
        switch (this.state) {
            case 'DON’T WALK':
                if (event === 'buttonPress') {
                    this.state = 'WALK';
                }
                break;
            case 'WALK':
                if (event === 'timer') {
                    this.state = 'FLASHING DON’T WALK';
                }
                break;
            case 'FLASHING DON’T WALK':
                if (event === 'timer') {
                    this.state = 'DON’T WALK';
                }
                break;
        }
    }

    toString() {
        return ` ${this.state}`;
    }
}


const trafficLight = new TrafficLightFSM();
console.log(trafficLight.toString());
trafficLight.onEvent('timer');
console.log(trafficLight.toString());
trafficLight.onEvent('timer');
console.log(trafficLight.toString());
trafficLight.onEvent('timer');
console.log(trafficLight.toString());


const pedestrianLight = new PedestrianTrafficLightFSM();
console.log(pedestrianLight.toString());
pedestrianLight.onEvent('buttonPress');
console.log(pedestrianLight.toString());
pedestrianLight.onEvent('timer');
console.log(pedestrianLight.toString());
pedestrianLight.onEvent('timer');
console.log(pedestrianLight.toString());
