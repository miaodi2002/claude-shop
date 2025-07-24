'use client'

import { RedocStandalone } from 'redoc'

interface RedocComponentProps {
  specUrl?: string
  spec?: object
}

export default function RedocComponent({ 
  specUrl = '/api-specification.yaml',
  spec 
}: RedocComponentProps) {
  return (
    <div className="redoc-container">
      <RedocStandalone 
        specUrl={spec ? undefined : specUrl}
        spec={spec}
        options={{
          theme: {
            colors: {
              primary: {
                main: '#3b82f6'
              }
            },
            typography: {
              fontSize: '14px',
              lineHeight: '1.5em',
              code: {
                fontSize: '13px',
                fontFamily: 'Monaco, "Roboto Mono", monospace'
              }
            }
          },
          scrollYOffset: 60,
          hideDownloadButton: false,
          disableSearch: false,
          expandResponses: 'all',
          jsonSampleExpandLevel: 2,
          hideSchemaPattern: true,
          hideRequestPayloadSample: false,
          pathInMiddlePanel: true,
          requiredPropsFirst: true,
          sortPropsAlphabetically: true,
          showExtensions: true,
          nativeScrollbars: false
        }}
      />
    </div>
  )
}