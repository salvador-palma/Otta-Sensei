import { Button } from "@/components/ui/button"

const ButtonsPage = () => {
    return (
        <div className="p-4 space-y-4 flex flex-col max-w-[200px]">
            <div className="space-x-4 flex flex-row">
                <Button size="sm">Default</Button>
                <Button>Default</Button>
                <Button size="lg">Default</Button>
                <Button size="icon">X</Button>
            </div>
            <div className="space-x-4 flex flex-row">
                <Button variant="primary" size="sm">Primary</Button>
                <Button variant="primary">Primary</Button>
                <Button variant="primary" size="lg">Primary</Button>
                <Button variant="primary" size="icon">X</Button>
            </div>
            <div className="space-x-4 flex flex-row">
                <Button variant="outline" size="sm">Overline</Button>
                <Button variant="outline">Overline</Button>
                <Button variant="outline" size="lg">Overline</Button>
                <Button variant="outline" size="icon">X</Button>
            </div>
            <div className="space-x-4 flex flex-row">
                <Button  variant="ghost" size="sm">Ghost</Button>
                <Button  variant="ghost">Ghost</Button>
                <Button  variant="ghost" size="lg">Ghost</Button>
                <Button  variant="ghost" size="icon">X</Button>
            </div>
            

        </div>
    )
}

export default ButtonsPage