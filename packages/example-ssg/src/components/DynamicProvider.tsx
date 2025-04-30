import { FC, PropsWithChildren, useEffect } from 'react';
import { FronteggProviderNoSSR } from '@frontegg/nextjs';


const contextOptions = {
  baseUrl: 'https://app-tzfpgdmacxhi.stg.frontegg.com',
  clientId: 'b9e58548-4c78-4292-88bd-d3d6c9ee015b',
}

// eslint-disable-next-line
const createDynamicProvider = (options: any) => {


  const dynamicProvider: FC<PropsWithChildren> = ({ children }) => {


    console.log("DynamicProvider", typeof window)
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useEffect(() => {
      console.log('DynamicProvider')
    }, []);

    return <FronteggProviderNoSSR contextOptions={options}
                                  customLoader
                                  authOptions={{
                                    // isLoading:true,
                                    keepSessionAlive:true,
                                    // routes: {
                                    //   loginUrl: `/account/login/`,
                                    // }
                                  }}
                                  themeOptions={{
                                    loginBox: {
                                      signup: {
                                        overrideSignupFields: ({fields}) => {
                                          
                                          return {
                                            tomer: {
                                              type:'custom',
                                              fieldType:'input',
                                              fieldProps:{
                                                label:"ds",
                                                placeholder:"ds",
                                                type:"text",
                                                
                                                
                                              }
                                            },
                                            ...fields
                                          }
                                        }
                                      }
                                    }
                                  }}
                                  >
      {children}
    </FronteggProviderNoSSR>
  }
  return dynamicProvider;
}

const DynamicProvider = createDynamicProvider(contextOptions);
export default DynamicProvider
