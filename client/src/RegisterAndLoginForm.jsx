import { useState } from "react";
import axios from 'axios';
import { useContext } from "react";
import { UserContext } from "./UserContext";
 

export default function RegisterAndLoginForm(){
    const [ username, setUsername] = useState('');
    const [ password ,setPassword ]= useState('')
    const [isLoginOrRegister, setIsLoginOrRegister] = useState('register');
    const {setUsername:setloggedInUsername, setId} = useContext(UserContext);
     async function handleSubmit(ev){
        ev.preventDefault();
        const url = isLoginOrRegister === 'register' ? 'register': 'login';
     const {data} = await axios.post( url,{username,password});
     setloggedInUsername(username);
     setId(data.id);

    }
    return (
        <div className="bg-blue-50 h-screen flex items-center">
            <form className="w-64 mx-auto mb-12" onSubmit={handleSubmit}>
                <input value={ username } onChange={ ev => setUsername(ev.target.value)}
                 type="text" placeholder="Username" 
                 className="block w-full rounded-sm p-2 mb-2 border" />
                <input value={ password } onChange={ ev => setPassword(ev.target.value)} 
                type="password" placeholder="Password" 
                className="block w-full rounded-sm p-2 mb-2"/>
                <button className="bg-blue-500 text-white block w-full rounded-sm p-2">
                   {isLoginOrRegister === 'register' ? 'Register': 'Login'}
                    </button>
                <div className="text-center mt-2">
                    
                    {isLoginOrRegister === 'register' && (
                        <div>
                            Already a member? 
                            <button onClick={() => setIsLoginOrRegister('login')} >
                            Login here
                            </button>
                        </div>
                    )}
                    {isLoginOrRegister === 'login' && (
                       <div>
                        Don't have a account?
                        <button onClick={() => setIsLoginOrRegister('register')} >
                        Register
                        </button>
                       </div>
                    )}
                    </div>
            </form>
        </div>
    );
}