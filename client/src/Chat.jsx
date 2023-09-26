import { useContext, useEffect, useState, useRef } from "react"
import Avatar from "./Avatar";
import Logo from "./Logo";
import { UserContext } from "./UserContext";
import { uniqBy } from "lodash"
import axios from "axios";
import Contact from "./Contact";

export default function Chat(){
    const [ ws, setWs ] = useState(null);
    const [ onlinePeople,setOnlinePeople] = useState({});
    const [ offlinePeople, setOfflinePeople ] = useState({})
    const [ selectedUserId, setSelectedUserId ] = useState(null);
    const [ newMessageText, setNewMessageText ] = useState('')
    const [ messages, setMessages ] = useState([])
    const {username, id,setId, setUsername} = useContext(UserContext);
    const divUnderMessages = useRef();

    useEffect(() =>{
        connectToWs();
    }, []);

    function connectToWs(){
      const ws = new WebSocket('ws://localhost:4040')
      setWs(ws);
      ws.addEventListener('message',handleMessage)
      ws.addEventListener('close',() => {
        setTimeout(() =>{
         console.log("reconnecting");
         connectToWs();
        }, 1000)
    });
    }
    function showOnlinePeople(peopleArray){
        const people = {};
        peopleArray.forEach(({userId, username}) => {
            people[userId] = username;
        })
        setOnlinePeople(people);
    }

    // the function to handleMessage to people
    function handleMessage(ev){
        const messageData = JSON.parse(ev.data)
        console.log({ev, messageData})
        if ('online' in messageData){
            showOnlinePeople(messageData.online)
        }else if ('text' in messageData){
            if(messageData.sender === selectedUserId){
                setMessages(prev => ([...prev, {...messageData}]));
            }
        }  
    }

    function logout(){
        axios.post('/logout').then(()=>{
            setWs(null);
            setId(null);
            setUsername(null);
        });
    }

    // the function to send a message
    function sendMessage(ev, file = null) {
        if (ev) ev.preventDefault();
        ws.send(JSON.stringify({
          recipient: selectedUserId,
          text: newMessageText,
          file,
        }));
        if (file) {
          axios.get('/messages/'+selectedUserId).then(res => {
            setMessages(res.data);
          });
        } else {
          setNewMessageText('');
          setMessages(prev => ([...prev,{
            text: newMessageText,
            sender: id,
            recipient: selectedUserId,
            _id: Date.now(),
          }]));
        }
      }
      function sendFile(ev) {
        const reader = new FileReader();
        reader.readAsDataURL(ev.target.files[0]);
        reader.onload = () => {
          sendMessage(null, {
            name: ev.target.files[0].name,
            data: reader.result,
          });
        };
      }




    useEffect(()=> {
        const div = divUnderMessages.current;
        if(div){
            div.scrollIntoView({behavior:'smooth', block:'end'});
        }
    },[messages]);

    useEffect(()=> {
        if(selectedUserId){
            axios.get('/messages/'+selectedUserId).then(res => {
                setMessages(res.data);

            })
        }
    },[selectedUserId]);


    useEffect(() => {
    axios.get('/people').then(res => {
      const offlinePeopleArr = res.data
        .filter(p => p._id !== id)
        .filter(p => !Object.keys(onlinePeople).includes(p._id));
      const offlinePeople = {};
      offlinePeopleArr.forEach(p => {
        offlinePeople[p._id] = p;
      });
      setOfflinePeople(offlinePeople);
    });
  }, [onlinePeople]);

    const onlinePeopleExclOurUser = {...onlinePeople};
    delete onlinePeopleExclOurUser[id];

    console.log({onlinePeopleExclOurUser});

    const messagesWithoutDupes = uniqBy(messages, '_id') ;
    return (
        <div className="flex h-screen">
            <div className="bg-white w-1/3 flex flex-col">
                <div className="flex-grow">
                <Logo/>
              
              {Object.keys(onlinePeopleExclOurUser).map(userId => (
                  <Contact 
                  key={userId}
                  id={userId} 
                  online={true}
                  username={onlinePeopleExclOurUser[userId]}
                  onClick={()=> setSelectedUserId(userId)}
                  selected={userId === selectedUserId}
                  ></Contact>
              ))}
              {Object.keys(offlinePeople).map(userId => (
                  <Contact 
                  key={userId}
                  id={userId} 
                  online={false}
                  username={offlinePeople[userId].username}
                  onClick={()=> setSelectedUserId(userId)}
                  selected={userId === selectedUserId}
                  ></Contact>
              ))}
                </div>
                <div className="gap-1 p-2 text-center flex items-center justify-center">
                  <span className="font-bold gap-1 mr-2 text-sm text-gray-300 flex items-center"> 
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                  <path d="M4.5 6.375a4.125 4.125 0 118.25 0 4.125 4.125 0 01-8.25 0zM14.25 8.625a3.375 3.375 0 116.75 0 3.375 3.375 0 01-6.75 0zM1.5 19.125a7.125 7.125 0 0114.25 0v.003l-.001.119a.75.75 0 01-.363.63 13.067 13.067 0 01-6.761 1.873c-2.472 0-4.786-.684-6.76-1.873a.75.75 0 01-.364-.63l-.001-.122zM17.25 19.128l-.001.144a2.25 2.25 0 01-.233.96 10.088 10.088 0 005.06-1.01.75.75 0 00.42-.643 4.875 4.875 0 00-6.957-4.611 8.586 8.586 0 011.71 5.157v.003z" />
                  </svg>
                  {username}
                  </span>  
                    <button 
                    onClick={logout}
                    className="text-sm bg-blue-100 py-1 px-2 text-gray-500 border rounded-sm">logout</button>
                   
                    </div>
                </div>
            <div className="flex flex-col bg-blue-50 w-2/3 p-2">
                <div className="flex-grow">
                    {!selectedUserId && (
                        <div className="flex flex-grow h-full items-center justify-center">
                           <div className="text-gray-300">&larr; Select a person to PinsChat </div>
                            </div>
                    )}
                    {!!selectedUserId && (
                        // the box of the message!
                            <div className="relative h-full">
                            <div className="overflow-y-scroll absolute top-0 left-0 right-0 bottom-2">
                            {messagesWithoutDupes.map(message => (
                                <div key={message._id} className={(message.sender === id ? 'text-right' : 'text-left')}>
                                <div className={"text-left inline-block p-2 m-2 rounded-md text-sm " +(message.sender == id ? 'bg-green-500 text-white' : 'bg-white text-gray-500')}>
                                    {message.text}
                                    {message.file && (
                                        <div className="">    
                                            <a target="_blank" className=" flex items-center gap-1 border-b" href={axios.defaults.baseURL + '/uploads/' + message.file}>
                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                                            <path fillRule="evenodd" d="M19.902 4.098a3.75 3.75 0 00-5.304 0l-4.5 4.5a3.75 3.75 0 001.035 6.037.75.75 0 01-.646 1.353 5.25 5.25 0 01-1.449-8.45l4.5-4.5a5.25 5.25 0 117.424 7.424l-1.757 1.757a.75.75 0 11-1.06-1.06l1.757-1.757a3.75 3.75 0 000-5.304zm-7.389 4.267a.75.75 0 011-.353 5.25 5.25 0 011.449 8.45l-4.5 4.5a5.25 5.25 0 11-7.424-7.424l1.757-1.757a.75.75 0 111.06 1.06l-1.757 1.757a3.75 3.75 0 105.304 5.304l4.5-4.5a3.75 3.75 0 00-1.035-6.037.75.75 0 01-.354-1z" clipRule="evenodd" />
                                            </svg>
                                            {message.file}
                                            </a>
                                        </div>
                                    )}
                                </div>
                                </div>
                            ))}
                            <div ref={divUnderMessages}>
                            </div>
                        </div>
                     </div>
                        
                    )}
                </div>
                {!!selectedUserId && (
                     <form className="flex gap-2" onSubmit={sendMessage}>
                     <input type="text" 
                     value={newMessageText}
                     onChange={ev => setNewMessageText(ev.target.value)}
                     placeholder='Type your message here' 
                     className="bg-white flex-grow border rounded-sm p-2" />
                     <label className=" bg-green-100 p-2 text-green-600 cursor-pointer rounded-sm border border-green-200">
                        <input type="file" className="hidden" onChange={sendFile}/>
                     <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                    <path fillRule="evenodd" d="M19.902 4.098a3.75 3.75 0 00-5.304 0l-4.5 4.5a3.75 3.75 0 001.035 6.037.75.75 0 01-.646 1.353 5.25 5.25 0 01-1.449-8.45l4.5-4.5a5.25 5.25 0 117.424 7.424l-1.757 1.757a.75.75 0 11-1.06-1.06l1.757-1.757a3.75 3.75 0 000-5.304zm-7.389 4.267a.75.75 0 011-.353 5.25 5.25 0 011.449 8.45l-4.5 4.5a5.25 5.25 0 11-7.424-7.424l1.757-1.757a.75.75 0 111.06 1.06l-1.757 1.757a3.75 3.75 0 105.304 5.304l4.5-4.5a3.75 3.75 0 00-1.035-6.037.75.75 0 01-.354-1z" clipRule="evenodd" />
                     </svg>

                     </label>
                     <button type="submit" className="bg-green-600 p-2 text-white rounded-sm">
                     <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                     </svg>
                     </button>
                 </form>
                )}
               
            </div>
        </div>
    );
}